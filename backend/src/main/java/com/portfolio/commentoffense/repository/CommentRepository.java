package com.portfolio.commentoffense.repository;

import com.portfolio.commentoffense.model.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    
    // Find recent comments
    List<Comment> findTop100ByOrderByAnalyzedAtDesc();
    
    // Count operations for metrics (analyzed since a given time, e.g. start of day)
    long countByAnalyzedAtAfter(LocalDateTime startOfDay);
    
    long countByLabelAndAnalyzedAtAfter(String label, LocalDateTime startOfDay);
}
