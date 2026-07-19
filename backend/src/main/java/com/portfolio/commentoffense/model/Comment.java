package com.portfolio.commentoffense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "comments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Comment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_text", nullable = false, columnDefinition = "TEXT")
    private String commentText;

    @Column(nullable = false, length = 100)
    private String website;

    @Column(name = "toxicity_score", nullable = false)
    private Double toxicityScore;

    @Column(nullable = false, length = 50)
    private String label;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "insult_score")
    private Double insultScore;

    @Column(name = "threat_score")
    private Double threatScore;

    @Column(name = "hate_score")
    private Double hateScore;

    @Column(name = "spam_score")
    private Double spamScore;

    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "analyzed_at", nullable = false, updatable = false)
    private LocalDateTime analyzedAt;

    @PrePersist
    protected void onCreate() {
        this.analyzedAt = LocalDateTime.now();
    }
}
