package com.portfolio.commentoffense.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.commentoffense.dto.AnalyzeRequest;
import com.portfolio.commentoffense.dto.AnalyzeResponse;
import com.portfolio.commentoffense.dto.StatsResponse;
import com.portfolio.commentoffense.model.Comment;
import com.portfolio.commentoffense.service.AnalysisService;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AnalysisController.class)
public class AnalysisControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AnalysisService analysisService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    public void testAnalyzeComment_Success() throws Exception {
        // Arrange
        AnalyzeRequest request = new AnalyzeRequest("You are awesome!", "youtube.com");
        
        Comment mockComment = Comment.builder()
                .id(1L)
                .commentText("You are awesome!")
                .website("youtube.com")
                .label("Safe")
                .confidence(0.95)
                .toxicityScore(0.05)
                .insultScore(0.01)
                .threatScore(0.01)
                .hateScore(0.01)
                .spamScore(0.01)
                .explanation("Clean comment.")
                .build();

        AnalyzeResponse response = AnalyzeResponse.builder()
                .id(1L)
                .text("You are awesome!")
                .label("Safe")
                .score(0.95)
                .reason("Clean comment.")
                .toxicity(0.05)
                .insult(0.01)
                .threat(0.01)
                .hate(0.01)
                .spam(0.01)
                .build();

        given(analysisService.analyzeAndSaveComment(anyString(), anyString())).willReturn(mockComment);
        given(analysisService.mapToResponse(mockComment)).willReturn(response);

        // Act & Assert
        mockMvc.perform(post("/api/analyze")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.text").value("You are awesome!"))
                .andExpect(jsonPath("$.label").value("Safe"))
                .andExpect(jsonPath("$.score").value(0.95))
                .andExpect(jsonPath("$.toxicity").value(0.05));
    }

    @Test
    public void testGetStatistics_Success() throws Exception {
        // Arrange
        StatsResponse mockStats = StatsResponse.builder()
                .totalScanned(10)
                .safeCount(7)
                .offensiveCount(2)
                .spamCount(1)
                .build();

        given(analysisService.getTodayStats()).willReturn(mockStats);

        // Act & Assert
        mockMvc.perform(get("/api/statistics"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalScanned").value(10))
                .andExpect(jsonPath("$.safeCount").value(7))
                .andExpect(jsonPath("$.offensiveCount").value(2))
                .andExpect(jsonPath("$.spamCount").value(1));
    }

    @Test
    public void testGetHistory_Success() throws Exception {
        // Arrange
        given(analysisService.getRecentHistory()).willReturn(Collections.emptyList());

        // Act & Assert
        mockMvc.perform(get("/api/history"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    public void testDeleteHistoryItem_Success() throws Exception {
        // Act & Assert
        mockMvc.perform(delete("/api/history/1"))
                .andExpect(status().isNoContent());
        
        Mockito.verify(analysisService).deleteHistoryItem(1L);
    }
}
