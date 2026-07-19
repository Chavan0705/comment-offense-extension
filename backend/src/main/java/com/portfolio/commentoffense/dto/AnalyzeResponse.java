package com.portfolio.commentoffense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyzeResponse {
    private Long id;
    private String text;
    private String label;
    private Double score;
    private String reason;
    private Double toxicity;
    private Double insult;
    private Double threat;
    private Double hate;
    private Double spam;
}
