package com.portfolio.commentoffense.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.commentoffense.dto.AnalyzeResponse;
import com.portfolio.commentoffense.dto.StatsResponse;
import com.portfolio.commentoffense.model.Comment;
import com.portfolio.commentoffense.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class AnalysisService {

    @Autowired
    private CommentRepository commentRepository;

    @Value("${ai.huggingface.token:}")
    private String hfToken;

    @Value("${ai.huggingface.model-url}")
    private String hfModelUrl;

    @Value("${ai.gemini.key:}")
    private String geminiKey;

    @Value("${ai.gemini.model-url}")
    private String geminiModelUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Lexicons for Heuristic fallback
    private final Set<String> insultWords = new HashSet<>(Arrays.asList(
            "stupid", "idiot", "moron", "dumb", "loser", "trash", "jerk", "fool", "clown", "bastard",
            "asshole", "bitch", "crap", "dick", "pathetic", "suck", "sucks", "ugly", "shut up", "idiotic"
    ));

    private final Set<String> threatWords = new HashSet<>(Arrays.asList(
            "kill", "die", "murder", "destroy", "beat", "shoot", "stab", "punch", "strangle", "choke",
            "burn", "hang", "throat", "slay", "assassinate", "wipe out", "hunt you", "going to get you"
    ));

    private final Set<String> hateWords = new HashSet<>(Arrays.asList(
            "nigger", "faggot", "retard", "kike", "chink", "spic", "tranny", "dyke", "cunt", "gay",
            "hate", "disgusting", "subhuman", "vermin", "scum", "illegal", "refugee", "terrorist"
    ));

    private final Set<String> spamWords = new HashSet<>(Arrays.asList(
            "subscribe", "free money", "make money", "click here", "giveaway", "crypto", "bitcoin",
            "telegram", "whatsapp", "dm me", "check my bio", "onlyfans", "cash back", "followers"
    ));

    private final Set<String> positiveWords = new HashSet<>(Arrays.asList(
            "good", "great", "awesome", "perfect", "excellent", "love", "nice", "cool", "wonderful",
            "amazing", "beautiful", "thanks", "thank you", "helpful", "superb"
    ));

    private final Set<String> negativeWords = new HashSet<>(Arrays.asList(
            "bad", "worst", "hate", "terrible", "horrible", "dislike", "angry", "annoying", "boring",
            "waste", "not", "no", "never", "ruined", "disappointed"
    ));

    /**
     * Main analysis method. Attempts external AI API first, then falls back to local Java Lexicon Engine.
     */
    public Comment analyzeAndSaveComment(String text, String website) {
        if (text == null || text.trim().isEmpty()) {
            return saveCommentEntity("", website, "Safe", 0.0, "Empty comment.", 0.0, 0.0, 0.0, 0.0, 0.0);
        }

        Comment result = null;

        // Try Gemini API first if key exists
        if (geminiKey != null && !geminiKey.trim().isEmpty()) {
            try {
                result = analyzeWithGemini(text, website);
            } catch (Exception e) {
                System.err.println("Gemini API request failed, trying Hugging Face or Heuristic. Error: " + e.getMessage());
            }
        }

        // Try Hugging Face next if token exists and Gemini didn't run
        if (result == null && hfToken != null && !hfToken.trim().isEmpty()) {
            try {
                result = analyzeWithHuggingFace(text, website);
            } catch (Exception e) {
                System.err.println("Hugging Face API request failed, falling back to Lexicon. Error: " + e.getMessage());
            }
        }

        // Final Fallback: Heuristic Lexicon Engine
        if (result == null) {
            result = analyzeWithHeuristics(text, website);
        }

        // Save to database
        return commentRepository.save(result);
    }

    /**
     * Analyzes text using Hugging Face's toxic-bert model
     */
    private Comment analyzeWithHuggingFace(String text, String website) throws Exception {
        Map<String, String> body = Map.of("inputs", text);
        String requestBody = objectMapper.writeValueAsString(body);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(hfModelUrl))
                .header("Authorization", "Bearer " + hfToken)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("HF API returned status code " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        // toxic-bert returns a list of classification arrays, e.g. [[{"label":"toxic","score":0.9},...]]
        JsonNode predictions = root.get(0);
        
        double toxicity = 0.0;
        double severeToxic = 0.0;
        double obscene = 0.0;
        double threat = 0.0;
        double insult = 0.0;
        double hate = 0.0;

        for (JsonNode pred : predictions) {
            String label = pred.get("label").asText();
            double score = pred.get("score").asDouble();
            switch (label.toLowerCase()) {
                case "toxic" -> toxicity = score;
                case "severe_toxic" -> severeToxic = score;
                case "obscene" -> obscene = score;
                case "threat" -> threat = score;
                case "insult" -> insult = score;
                case "identity_hate" -> hate = score;
            }
        }

        // Combine toxic & severe toxic
        if (severeToxic > 0.5) {
            toxicity = Math.min(1.0, toxicity * 1.2);
        }

        double spam = checkSpamScore(text.toLowerCase());

        return mapScoresToComment(text, website, toxicity, insult, threat, hate, spam);
    }

    /**
     * Analyzes text using Gemini API
     */
    private Comment analyzeWithGemini(String text, String website) throws Exception {
        // Construct the prompt requesting structured JSON output
        String prompt = "Analyze the following comment for moderation purposes. " +
                "Respond ONLY with a valid raw JSON object matching this structure exactly (do not wrap in markdown or code blocks):\n" +
                "{\n" +
                "  \"toxicity\": 0.0-1.0,\n" +
                "  \"insult\": 0.0-1.0,\n" +
                "  \"threat\": 0.0-1.0,\n" +
                "  \"hate\": 0.0-1.0\n" +
                "}\n\n" +
                "Comment: \"" + text.replace("\"", "\\\"") + "\"";

        // JSON payload for Gemini API
        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> parts = Map.of("parts", List.of(textPart));
        Map<String, Object> contentNode = Map.of("contents", List.of(parts));
        
        String requestBody = objectMapper.writeValueAsString(contentNode);
        String url = geminiModelUrl + "?key=" + geminiKey;

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("Gemini API returned status code " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = objectMapper.readTree(response.body());
        String geminiText = root.path("candidates").get(0)
                .path("content").path("parts").get(0)
                .path("text").asText().trim();

        // Clean markdown wraps if Gemini wraps it in ```json ... ```
        if (geminiText.startsWith("```")) {
            geminiText = geminiText.replaceAll("^```json\\s*", "").replaceAll("\\s*```$", "");
        }

        JsonNode scoreNode = objectMapper.readTree(geminiText);
        double toxicity = scoreNode.path("toxicity").asDouble(0.0);
        double insult = scoreNode.path("insult").asDouble(0.0);
        double threat = scoreNode.path("threat").asDouble(0.0);
        double hate = scoreNode.path("hate").asDouble(0.0);
        double spam = checkSpamScore(text.toLowerCase());

        return mapScoresToComment(text, website, toxicity, insult, threat, hate, spam);
    }

    /**
     * Local Java-based Heuristic & Lexicon analyzer
     */
    private Comment analyzeWithHeuristics(String text, String website) {
        String textLower = text.toLowerCase();

        // 1. Sentiment Score Proxy
        double sentimentNeg = 0.0;
        int negCount = countMatches(textLower, negativeWords);
        int posCount = countMatches(textLower, positiveWords);
        
        if (negCount > posCount) {
            sentimentNeg = Math.min(0.8, (negCount - posCount) * 0.2);
        } else if (negCount == posCount && negCount > 0) {
            sentimentNeg = 0.2; // Borderline neutral-neg
        }

        // 2. Count Matches in Offense Categories
        int insultCount = countMatches(textLower, insultWords);
        int threatCount = countMatches(textLower, threatWords);
        int hateCount = countMatches(textLower, hateWords);
        double spamScore = checkSpamScore(textLower);

        // 3. Compute Scores
        double insultScore = Math.min(1.0, (insultCount * 0.35) + (sentimentNeg * 0.3));
        double threatScore = Math.min(1.0, (threatCount * 0.6) + (sentimentNeg * 0.15));
        double hateScore = Math.min(1.0, (hateCount * 0.7) + (sentimentNeg * 0.1));

        double maxScore = Math.max(insultScore, Math.max(threatScore, hateScore));
        double toxicityScore = Math.min(1.0, (maxScore * 0.8) + (sentimentNeg * 0.2));

        if (toxicityScore < 0.2 && sentimentNeg > 0.4) {
            toxicityScore = 0.25;
        }

        return mapScoresToComment(text, website, toxicityScore, insultScore, threatScore, hateScore, spamScore);
    }

    private int countMatches(String text, Set<String> lexicon) {
        int count = 0;
        for (String word : lexicon) {
            // Match word boundaries
            Pattern pattern = Pattern.compile("\\b" + Pattern.quote(word) + "\\b");
            var matcher = pattern.matcher(text);
            while (matcher.find()) {
                count++;
            }
        }
        return count;
    }

    private double checkSpamScore(String textLower) {
        int spamMatches = countMatches(textLower, spamWords);
        
        // Link checking
        long linksCount = Pattern.compile("https?://\\S+|www\\.\\S+").matcher(textLower).results().count();

        // Caps ratio checking
        double capsRatio = 0.0;
        if (textLower.length() > 15) {
            long capsCount = textLower.chars().filter(Character::isUpperCase).count();
            capsRatio = (double) capsCount / textLower.length();
        }

        double score = 0.0;
        if (spamMatches > 0) {
            score += 0.4 + (spamMatches * 0.15);
        }
        if (linksCount > 0) {
            score += 0.5 + (linksCount * 0.1);
        }
        if (capsRatio > 0.5) {
            score += 0.2;
        }

        return Math.min(1.0, score);
    }

    private Comment mapScoresToComment(String text, String website, double toxicity, double insult, double threat, double hate, double spam) {
        double maxScore = Math.max(toxicity, Math.max(insult, Math.max(threat, hate)));
        String label;
        double confidence;
        String reason;

        if (spam > 0.6 && spam > maxScore) {
            label = "Spam";
            confidence = spam;
            reason = "Comment flagged as spam. Contains self-promotion, advertising keywords, or suspicious links.";
        } else if (maxScore >= 0.70) {
            label = "Offensive";
            confidence = maxScore;
            
            List<String> reasons = new ArrayList<>();
            if (hate >= 0.6) reasons.add("Contains potential hate speech or derogatory slurs.");
            if (threat >= 0.6) reasons.add("Detected threatening or violent phrasing.");
            if (insult >= 0.6) reasons.add("Contains insulting or abusive words targeting individuals.");
            if (reasons.isEmpty()) reasons.add("High toxicity score indicates hostile or toxic behavior.");
            reason = String.join(" ", reasons);
        } else if (maxScore >= 0.40) {
            label = "Suspicious";
            confidence = maxScore;
            
            List<String> reasons = new ArrayList<>();
            if (hate >= 0.35) reasons.add("Features biased or borderline hate-speech patterns.");
            if (threat >= 0.35) reasons.add("Slightly threatening language.");
            if (insult >= 0.35) reasons.add("Borderline derogatory or mocking language.");
            if (reasons.isEmpty()) reasons.add("Negative sentiment indicating potential toxicity.");
            reason = String.join(" ", reasons);
        } else {
            label = "Safe";
            confidence = 1.0 - maxScore;
            reason = "Clean and polite content. Good for positive engagement.";
        }

        return Comment.builder()
                .commentText(text)
                .website(website)
                .toxicityScore(Math.round(toxicity * 100.0) / 100.0)
                .label(label)
                .confidence(Math.round(confidence * 100.0) / 100.0)
                .insultScore(Math.round(insult * 100.0) / 100.0)
                .threatScore(Math.round(threat * 100.0) / 100.0)
                .hateScore(Math.round(hate * 100.0) / 100.0)
                .spamScore(Math.round(spam * 100.0) / 100.0)
                .explanation(reason)
                .build();
    }

    private Comment saveCommentEntity(String text, String website, String label, double score, String reason, double toxicity, double insult, double threat, double hate, double spam) {
        return Comment.builder()
                .commentText(text)
                .website(website)
                .label(label)
                .toxicityScore(toxicity)
                .confidence(score)
                .explanation(reason)
                .insultScore(insult)
                .threatScore(threat)
                .hateScore(hate)
                .spamScore(spam)
                .build();
    }

    public List<Comment> getRecentHistory() {
        return commentRepository.findTop100ByOrderByAnalyzedAtDesc();
    }

    public void deleteHistoryItem(Long id) {
        commentRepository.deleteById(id);
    }

    public StatsResponse getTodayStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        long total = commentRepository.countByAnalyzedAtAfter(startOfDay);
        long safe = commentRepository.countByLabelAndAnalyzedAtAfter("Safe", startOfDay);
        long offensive = commentRepository.countByLabelAndAnalyzedAtAfter("Offensive", startOfDay) + 
                          commentRepository.countByLabelAndAnalyzedAtAfter("Suspicious", startOfDay);
        long spam = commentRepository.countByLabelAndAnalyzedAtAfter("Spam", startOfDay);

        return StatsResponse.builder()
                .totalScanned(total)
                .safeCount(safe)
                .offensiveCount(offensive)
                .spamCount(spam)
                .build();
    }

    public AnalyzeResponse mapToResponse(Comment comment) {
        return AnalyzeResponse.builder()
                .id(comment.getId())
                .text(comment.getCommentText())
                .label(comment.getLabel())
                .score(comment.getConfidence())
                .reason(comment.getExplanation())
                .toxicity(comment.getToxicityScore())
                .insult(comment.getInsultScore())
                .threat(comment.getThreatScore())
                .hate(comment.getHateScore())
                .spam(comment.getSpamScore())
                .build();
    }
}
