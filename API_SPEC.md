# VoPet 단어 저장 API 명세서

## 📌 엔드포인트

### 1. 단어 저장

```
POST /api/v1/words
```

**요청 헤더:**

```
Content-Type: application/json
```

**요청 바디:**

```json
{
  "userId": "temp_user_123", // 임시 사용자 ID (나중에 OAuth 토큰으로 대체)
  "word": "hello", // 단어
  "translation": "안녕하세요", // 번역
  "pronunciation": "헬로우", // 발음 (선택사항)
  "examples": "Hello, how are you?" // 예문 (선택사항)
}
```

**응답 성공 (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": 1, // 저장된 단어 ID
    "userId": "temp_user_123",
    "word": "hello",
    "translation": "안녕하세요",
    "pronunciation": "헬로우",
    "examples": "Hello, how are you?",
    "createdAt": "2024-01-01T00:00:00",
    "updatedAt": "2024-01-01T00:00:00"
  }
}
```

**응답 실패 (400 Bad Request):**

```json
{
  "success": false,
  "message": "필수 필드가 누락되었습니다."
}
```

**응답 실패 (500 Internal Server Error):**

```json
{
  "success": false,
  "message": "서버 오류가 발생했습니다."
}
```

---

## 📊 데이터베이스 설계 (MySQL)

### words 테이블

```sql
CREATE TABLE words (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id VARCHAR(255) NOT NULL,              -- 사용자 ID (임시 또는 OAuth)
    word VARCHAR(500) NOT NULL,                  -- 단어
    translation VARCHAR(500) NOT NULL,           -- 번역
    pronunciation VARCHAR(500),                  -- 발음 (선택사항)
    examples TEXT,                               -- 예문 (선택사항)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_word (word)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🚀 Spring Boot 구현 예시

### 1. Entity

```java
package com.vopet.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "words")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Word {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = true)  // OAuth 미구현 시 허용
    private String userId;

    // DB 제약조건 (DB 레벨 검증)
    @Column(nullable = false, length = 500)
    private String word;

    @Column(nullable = false, length = 500)
    private String translation;

    // 참고: Entity에서도 @NotBlank를 사용할 수 있지만,
    // 일반적으로는 DTO에서 Bean Validation, Entity에서는 DB 제약조건만 사용

    @Column(length = 500)
    private String pronunciation;

    @Column(columnDefinition = "TEXT")
    private String examples;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

### 2. DTO

```java
package com.vopet.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WordRequest {
    // OAuth 미구현 시 userId는 선택사항 (null이면 "anonymous"로 설정)
    private String userId;

    @NotBlank(message = "단어는 필수입니다.")
    private String word;

    @NotBlank(message = "번역은 필수입니다.")
    private String translation;

    private String pronunciation;
    private String examples;
}
```

```java
package com.vopet.dto;

import com.vopet.entity.Word;
import lombok.*;

import java.time.LocalDateTime;

/**
 * 응답 DTO (Response DTO)
 *
 * 현재 Chrome Extension에서는 response.success만 체크하지만,
 * 향후 기능을 위해 미리 정의:
 * - 안드로이드 앱: 단어 목록 조회 시 사용 (GET /api/v1/words)
 * - 단어 수정/삭제: id가 필요 (PUT/DELETE /api/v1/words/{id})
 * - 표준 REST API 패턴 유지
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WordResponse {
    private Long id;  // ← 수정/삭제 시 필요
    private String userId;
    private String word;
    private String translation;
    private String pronunciation;
    private String examples;
    private LocalDateTime createdAt;  // ← 안드로이드 앱에서 정렬용
    private LocalDateTime updatedAt;

    public static WordResponse from(Word word) {
        return WordResponse.builder()
            .id(word.getId())
            .userId(word.getUserId())
            .word(word.getWord())
            .translation(word.getTranslation())
            .pronunciation(word.getPronunciation())
            .examples(word.getExamples())
            .createdAt(word.getCreatedAt())
            .updatedAt(word.getUpdatedAt())
            .build();
    }
}
```

### 3. Repository

```java
package com.vopet.repository;

import com.vopet.entity.Word;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WordRepository extends JpaRepository<Word, Long> {
    List<Word> findByUserId(String userId);
    boolean existsByUserIdAndWord(String userId, String word);
}
```

### 4. Service

```java
package com.vopet.service;

import com.vopet.dto.WordRequest;
import com.vopet.dto.WordResponse;
import com.vopet.entity.Word;
import com.vopet.repository.WordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WordService {
    private final WordRepository wordRepository;

    @Transactional
    public WordResponse saveWord(WordRequest request) {
        // OAuth 미구현 시 userId가 null이면 기본값 설정
        String userId = request.getUserId();
        if (userId == null || userId.trim().isEmpty()) {
            userId = "anonymous";  // 또는 "temp_user_" + System.currentTimeMillis()
        }

        // 중복 체크 (같은 사용자가 같은 단어를 여러 번 저장하는 것 방지)
        boolean exists = wordRepository.existsByUserIdAndWord(
            userId,
            request.getWord()
        );

        Word word;
        if (exists) {
            // 이미 존재하면 업데이트
            word = wordRepository.findByUserId(userId).stream()
                .filter(w -> w.getWord().equals(request.getWord()))
                .findFirst()
                .orElseThrow();

            word.setTranslation(request.getTranslation());
            word.setPronunciation(request.getPronunciation());
            word.setExamples(request.getExamples());
        } else {
            // 없으면 새로 생성
            word = Word.builder()
                .userId(userId)
                .word(request.getWord())
                .translation(request.getTranslation())
                .pronunciation(request.getPronunciation())
                .examples(request.getExamples())
                .build();
        }

        Word savedWord = wordRepository.save(word);
        return WordResponse.from(savedWord);
    }
}
```

### 5. Controller

```java
package com.vopet.controller;

import com.vopet.dto.WordRequest;
import com.vopet.dto.WordResponse;
import com.vopet.service.WordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WordController {
    private final WordService wordService;

    @PostMapping("/words")
    public ResponseEntity<?> saveWord(@Valid @RequestBody WordRequest request) {
        try {
            WordResponse response = wordService.saveWord(request);

            Map<String, Object> result = Map.of(
                "success", true,
                "data", response
            );

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, Object> error = Map.of(
                "success", false,
                "message", e.getMessage()
            );

            return ResponseEntity.badRequest().body(error);
        }
    }
}
```

### 6. CORS 설정 (필수!)

**⚠️ 이미 SecurityConfig.java에 CORS 설정이 있다면 별도로 만들 필요 없습니다!**

만약 SecurityConfig.java가 없다면 아래 코드를 사용하세요:

```java
package com.vopet.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();

        // 모든 origin 허용 (Chrome Extension, Android App 등)
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*");

        // 허용할 HTTP 메서드
        config.addAllowedMethod("GET");
        config.addAllowedMethod("POST");
        config.addAllowedMethod("PUT");
        config.addAllowedMethod("DELETE");
        config.addAllowedMethod("OPTIONS");

        // 허용할 헤더
        config.addAllowedHeader("*");

        // 모든 경로에 적용
        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }
}
```

### 7. application.yml (RDS 연결)

```yaml
spring:
  datasource:
    url: jdbc:mysql://your-rds-endpoint:3306/vopet?useSSL=true&serverTimezone=UTC&characterEncoding=UTF-8
    username: your-username
    password: your-password
    driver-class-name: com.mysql.cj.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update # 개발 환경: update, 운영 환경: validate
    show-sql: true
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect

server:
  port: 8080
  servlet:
    context-path: /
```

---

## 🔧 Chrome Extension 연동

### Background.js 설정

`background.js`의 117번째 줄에 EC2 서버 URL을 입력하세요:

```javascript
// TODO: EC2 서버 URL로 변경 필요
const API_URL = "https://your-ec2-server.com/api/v1/words";
```

**예시:**

```
http://ec2-xxx.ap-northeast-2.compute.amazonaws.com/api/v1/words
또는
https://api.vopet.com/api/v1/words
```

---

## ✅ 테스트 방법

### 1. Postman으로 테스트

```
POST http://localhost:8080/api/v1/words
Content-Type: application/json

{
  "userId": "test_user_001",
  "word": "hello",
  "translation": "안녕하세요",
  "pronunciation": "헬로우",
  "examples": "Hello, how are you?"
}
```

### 2. cURL로 테스트

```bash
curl -X POST http://localhost:8080/api/v1/words \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user_001",
    "word": "hello",
    "translation": "안녕하세요",
    "pronunciation": "헬로우",
    "examples": "Hello, how are you?"
  }'
```

### 3. Chrome Extension으로 테스트

1. `background.js`의 API_URL을 EC2 서버 주소로 변경
2. Chrome Extension 설치 후 아무 페이지에서 단어 드래그
3. 상세 정보 창에서 "저장" 버튼 클릭
4. Chrome DevTools Console에서 로그 확인

---

## 📝 TODO (향후 작업)

### Phase 1 - MVP (현재)

- [ ] **Spring Boot 프로젝트 생성** ← **지금 여기부터 시작!**
- [ ] 단어 저장 API (`POST /api/v1/words`)
- [ ] CORS 설정
- [x] Chrome Extension 연동 (코드는 이미 추가됨, 서버 연결만 하면 됨)

### Phase 2 - 기본 기능

- [ ] 단어 목록 조회 API (`GET /api/v1/words?userId=xxx`)
- [ ] 단어 삭제 API (`DELETE /api/v1/words/{id}`)
- [ ] 단어 수정 API (`PUT /api/v1/words/{id}`)
- [ ] 페이지네이션 구현

### Phase 3 - 고급 기능

- [ ] OAuth 인증 구현 (userId를 JWT 토큰에서 추출)
- [ ] 검색 기능 구현
- [ ] 로깅 및 모니터링

### Phase 4 - 운영 최적화 (나중에 필요할 때)

- [ ] Rate Limiting 적용
- [ ] 캐싱 (Redis)
- [ ] CDN 연동

---

## 🔒 보안 고려사항

### ✅ Spring Boot가 자동으로 처리하는 것들

1. **SQL Injection 방지**: JPA/Hibernate가 PreparedStatement로 자동 처리 ✅
2. **파라미터 바인딩**: `@RequestParam`, `@RequestBody` 등 자동 검증 ✅
3. **JSON 파싱**: Jackson이 자동으로 역직렬화 및 검증 ✅
4. **기본 필터**: Spring Security 없이도 일부 보안 헤더 제공 ✅

### ⚠️ 추가 설정이 필요한 것들

1. **CORS 설정**: Chrome Extension과 Android App 도메인만 허용

   - 필수! 안 하면 CORS 에러 발생

2. **XSS 방지**:

   - 이미 Chrome Extension에서 `escapeHtml()` 처리 중 ✅
   - 서버에서 추가로 필요하면 HTML 이스케이프 (일반적으로 안드로이드에서 띄우므로 불필요)

3. **Rate Limiting**:

   - 초기 단계에서는 **불필요** (나중에 트래픽 많아지면 추가)
   - AWS WAF로도 가능

4. **HTTPS**:
   - EC2 + CloudFront 또는 ALB로 자동 처리
   - Let's Encrypt 무료 SSL 인증서 사용

---

### 🎯 **초기 MVP에서는 필요한 것: CORS만!**

나머지는 추후 추가 가능합니다.

---

작성일: 2024년 1월 1일
최종 수정일: 2024년 1월 1일
