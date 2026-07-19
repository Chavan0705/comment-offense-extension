package com.portfolio.commentoffense.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BatchAnalyzeResponse {
    private List<AnalyzeResponse> results;
}
