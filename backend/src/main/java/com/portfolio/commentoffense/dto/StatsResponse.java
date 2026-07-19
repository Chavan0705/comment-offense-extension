package com.portfolio.commentoffense.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StatsResponse {
    private long totalScanned;
    private long safeCount;
    private long offensiveCount;
    private long spamCount;
}
