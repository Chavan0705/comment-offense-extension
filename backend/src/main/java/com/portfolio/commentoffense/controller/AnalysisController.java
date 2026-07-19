package com.portfolio.commentoffense.controller;

import com.portfolio.commentoffense.dto.*;
import com.portfolio.commentoffense.model.Comment;
import com.portfolio.commentoffense.service.AnalysisService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*") // Allow requests from any origin (including Chrome Extensions)
public class AnalysisController {

    @Autowired
    private AnalysisService analysisService;

    @PostMapping("/analyze")
    public ResponseEntity<AnalyzeResponse> analyzeComment(@RequestBody AnalyzeRequest request) {
        Comment analyzedComment = analysisService.analyzeAndSaveComment(request.getText(), request.getWebsite());
        return ResponseEntity.ok(analysisService.mapToResponse(analyzedComment));
    }

    @PostMapping("/analyze/batch")
    public ResponseEntity<BatchAnalyzeResponse> analyzeCommentsBatch(@RequestBody BatchAnalyzeRequest request) {
        List<AnalyzeResponse> responses = new ArrayList<>();
        
        for (String text : request.getTexts()) {
            Comment analyzedComment = analysisService.analyzeAndSaveComment(text, request.getWebsite());
            responses.add(analysisService.mapToResponse(analyzedComment));
        }
        
        return ResponseEntity.ok(new BatchAnalyzeResponse(responses));
    }

    @GetMapping("/history")
    public ResponseEntity<List<AnalyzeResponse>> getHistory() {
        List<Comment> history = analysisService.getRecentHistory();
        List<AnalyzeResponse> responses = history.stream()
                .map(analysisService::mapToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    @GetMapping("/statistics")
    public ResponseEntity<StatsResponse> getStatistics() {
        StatsResponse stats = analysisService.getTodayStats();
        return ResponseEntity.ok(stats);
    }

    @DeleteMapping("/history/{id}")
    public ResponseEntity<Void> deleteHistoryItem(@PathVariable Long id) {
        try {
            analysisService.deleteHistoryItem(id);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}
