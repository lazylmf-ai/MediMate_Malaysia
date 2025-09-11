#!/usr/bin/env node

/**
 * Java SDK Generator for MediMate Malaysia Healthcare API
 * Generates a comprehensive Java SDK with Malaysian cultural intelligence features
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// SDK configuration
const SDK_CONFIG = {
  groupId: 'my.medimate',
  artifactId: 'medimate-malaysia-sdk',
  version: '1.1.9',
  name: 'MediMate Malaysia Healthcare SDK',
  description: 'Official Java SDK for MediMate Malaysia Healthcare API with cultural intelligence',
  url: 'https://api.medimate.my',
  javaVersion: '11',
  springBootVersion: '3.1.0'
};

class JavaSDKGenerator {
  constructor(openApiSpec) {
    this.spec = openApiSpec;
    this.outputDir = path.join(__dirname, '../../sdks/java');
    this.packagePath = 'my/medimate/malaysia/sdk';
    this.packageName = 'my.medimate.malaysia.sdk';
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Create Java SDK directory structure
    const dirs = [
      'src/main/java/' + this.packagePath,
      'src/main/java/' + this.packagePath + '/client',
      'src/main/java/' + this.packagePath + '/model',
      'src/main/java/' + this.packagePath + '/service',
      'src/main/java/' + this.packagePath + '/util',
      'src/main/java/' + this.packagePath + '/exception',
      'src/main/java/' + this.packagePath + '/config',
      'src/main/resources',
      'src/test/java/' + this.packagePath,
      'docs',
      'examples'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.outputDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generate() {
    console.log('🚀 Generating Java SDK for MediMate Malaysia...');
    
    this.generatePomXml();
    this.generateMainClient();
    this.generateModels();
    this.generateCulturalService();
    this.generatePatientService();
    this.generateUtils();
    this.generateExceptions();
    this.generateConfiguration();
    this.generateExamples();
    this.generateTests();
    this.generateReadme();
    
    console.log('✅ Java SDK generated successfully!');
    console.log(`📁 Output directory: ${this.outputDir}`);
  }

  generatePomXml() {
    const pomXml = `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 
         http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>${SDK_CONFIG.groupId}</groupId>
    <artifactId>${SDK_CONFIG.artifactId}</artifactId>
    <version>${SDK_CONFIG.version}</version>
    <packaging>jar</packaging>

    <name>${SDK_CONFIG.name}</name>
    <description>${SDK_CONFIG.description}</description>
    <url>${SDK_CONFIG.url}</url>

    <licenses>
        <license>
            <name>MIT License</name>
            <url>https://opensource.org/licenses/MIT</url>
        </license>
    </licenses>

    <developers>
        <developer>
            <id>medimate-malaysia</id>
            <name>MediMate Malaysia</name>
            <email>sdk@medimate.my</email>
            <organization>MediMate Malaysia</organization>
            <organizationUrl>https://medimate.my</organizationUrl>
        </developer>
    </developers>

    <scm>
        <connection>scm:git:git://github.com/medimate-malaysia/java-sdk.git</connection>
        <developerConnection>scm:git:ssh://github.com/medimate-malaysia/java-sdk.git</developerConnection>
        <url>https://github.com/medimate-malaysia/java-sdk/tree/main</url>
    </scm>

    <properties>
        <maven.compiler.source>${SDK_CONFIG.javaVersion}</maven.compiler.source>
        <maven.compiler.target>${SDK_CONFIG.javaVersion}</maven.compiler.target>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <jackson.version>2.15.2</jackson.version>
        <okhttp.version>4.11.0</okhttp.version>
        <junit.version>5.9.3</junit.version>
        <mockito.version>5.3.1</mockito.version>
        <slf4j.version>2.0.7</slf4j.version>
        <spring.boot.version>${SDK_CONFIG.springBootVersion}</spring.boot.version>
    </properties>

    <dependencies>
        <!-- HTTP Client -->
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>okhttp</artifactId>
            <version>\${okhttp.version}</version>
        </dependency>

        <!-- JSON Processing -->
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>\${jackson.version}</version>
        </dependency>
        <dependency>
            <groupId>com.fasterxml.jackson.datatype</groupId>
            <artifactId>jackson-datatype-jsr310</artifactId>
            <version>\${jackson.version}</version>
        </dependency>

        <!-- Logging -->
        <dependency>
            <groupId>org.slf4j</groupId>
            <artifactId>slf4j-api</artifactId>
            <version>\${slf4j.version}</version>
        </dependency>

        <!-- Validation -->
        <dependency>
            <groupId>jakarta.validation</groupId>
            <artifactId>jakarta.validation-api</artifactId>
            <version>3.0.2</version>
        </dependency>

        <!-- Spring Boot Integration (Optional) -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
            <version>\${spring.boot.version}</version>
            <optional>true</optional>
        </dependency>

        <!-- WebSocket Support -->
        <dependency>
            <groupId>org.java-websocket</groupId>
            <artifactId>Java-WebSocket</artifactId>
            <version>1.5.3</version>
        </dependency>

        <!-- Test Dependencies -->
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>\${junit.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.mockito</groupId>
            <artifactId>mockito-core</artifactId>
            <version>\${mockito.version}</version>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>com.squareup.okhttp3</groupId>
            <artifactId>mockwebserver</artifactId>
            <version>\${okhttp.version}</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.11.0</version>
                <configuration>
                    <source>\${maven.compiler.source}</source>
                    <target>\${maven.compiler.target}</target>
                </configuration>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.0.0</version>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-source-plugin</artifactId>
                <version>3.3.0</version>
                <executions>
                    <execution>
                        <id>attach-sources</id>
                        <goals>
                            <goal>jar-no-fork</goal>
                        </goals>
                    </execution>
                </executions>
            </plugin>

            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-javadoc-plugin</artifactId>
                <version>3.5.0</version>
                <executions>
                    <execution>
                        <id>attach-javadocs</id>
                        <goals>
                            <goal>jar</goal>
                        </goals>
                    </execution>
                </executions>
                <configuration>
                    <source>\${maven.compiler.source}</source>
                    <detectJavaApiLink>false</detectJavaApiLink>
                </configuration>
            </plugin>
        </plugins>
    </build>

    <distributionManagement>
        <repository>
            <id>maven-central</id>
            <url>https://oss.sonatype.org/service/local/staging/deploy/maven2/</url>
        </repository>
        <snapshotRepository>
            <id>maven-central-snapshots</id>
            <url>https://oss.sonatype.org/content/repositories/snapshots/</url>
        </snapshotRepository>
    </distributionManagement>
</project>`;

    this.writeFile('pom.xml', pomXml);
  }

  generateMainClient() {
    const mainClient = `package ${this.packageName}.client;

import ${this.packageName}.config.MediMateConfig;
import ${this.packageName}.exception.MediMateException;
import ${this.packageName}.service.CulturalService;
import ${this.packageName}.service.PatientService;
import ${this.packageName}.service.AppointmentService;
import ${this.packageName}.service.MedicationService;
import ${this.packageName}.service.RealtimeService;
import ${this.packageName}.service.FhirService;
import ${this.packageName}.util.ApiKeyValidator;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.RequestBody;
import okhttp3.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * MediMate Malaysia Healthcare API Client
 * 
 * Official Java SDK with Malaysian cultural intelligence features including:
 * - Prayer time integration for all 13 Malaysian states
 * - Halal medication validation with JAKIM certification
 * - Multi-language support (Bahasa Malaysia, English, Chinese, Tamil)  
 * - PDPA 2010 compliance framework
 * - Real-time WebSocket notifications
 * - HL7 FHIR R4 compatibility
 * 
 * Example usage:
 * <pre>
 * MediMateConfig config = MediMateConfig.builder()
 *     .apiKey("mk_live_your_key_here")
 *     .malaysianState(MalaysianState.KUALA_LUMPUR)
 *     .preferredLanguage(SupportedLanguage.MALAY)
 *     .prayerTimeAware(true)
 *     .halalRequirements(true)
 *     .build();
 * 
 * MediMateMalaysiaClient client = new MediMateMalaysiaClient(config);
 * 
 * // Get prayer times
 * PrayerTimesResponse prayerTimes = client.getCultural()
 *     .getPrayerTimes(MalaysianState.KUALA_LUMPUR);
 * 
 * // Validate halal medication
 * HalalValidationResponse halalResult = client.getCultural()
 *     .validateMedication("Paracetamol 500mg", "Duopharma Biotech");
 * </pre>
 * 
 * @author MediMate Malaysia
 * @version ${SDK_CONFIG.version}
 */
public class MediMateMalaysiaClient implements AutoCloseable {

    private static final Logger logger = LoggerFactory.getLogger(MediMateMalaysiaClient.class);
    private static final String SDK_VERSION = "${SDK_CONFIG.version}";
    private static final String USER_AGENT = "MediMate-Malaysia-SDK-Java/" + SDK_VERSION;

    private final MediMateConfig config;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    // Service instances
    private final CulturalService culturalService;
    private final PatientService patientService;
    private final AppointmentService appointmentService;
    private final MedicationService medicationService;
    private final RealtimeService realtimeService;
    private final FhirService fhirService;

    /**
     * Create a new MediMate Malaysia API client
     * 
     * @param config Configuration including API key and cultural context
     * @throws MediMateException if configuration is invalid
     */
    public MediMateMalaysiaClient(MediMateConfig config) {
        if (config == null) {
            throw new MediMateException("Configuration cannot be null");
        }
        
        if (!ApiKeyValidator.isValid(config.getApiKey())) {
            throw new MediMateException(
                "Invalid API key format. Expected format: mk_live_... or mk_test_...",
                "INVALID_API_KEY"
            );
        }

        this.config = config;
        this.httpClient = createHttpClient();
        this.objectMapper = createObjectMapper();
        
        // Initialize service instances
        this.culturalService = new CulturalService(this);
        this.patientService = new PatientService(this);
        this.appointmentService = new AppointmentService(this);
        this.medicationService = new MedicationService(this);
        this.realtimeService = new RealtimeService(this);
        this.fhirService = new FhirService(this);

        logger.info("MediMate Malaysia SDK initialized with API key: {}...", 
                   config.getApiKey().substring(0, Math.min(12, config.getApiKey().length())));
    }

    /**
     * Create HTTP client with Malaysian healthcare configurations
     */
    private OkHttpClient createHttpClient() {
        OkHttpClient.Builder builder = new OkHttpClient.Builder()
            .connectTimeout(Duration.ofSeconds(config.getConnectTimeout()))
            .readTimeout(Duration.ofSeconds(config.getReadTimeout()))
            .writeTimeout(Duration.ofSeconds(config.getWriteTimeout()));

        // Add request interceptor for authentication and cultural context
        builder.addInterceptor(chain -> {
            Request originalRequest = chain.request();
            Request.Builder requestBuilder = originalRequest.newBuilder()
                .header("Authorization", "Bearer " + config.getApiKey())
                .header("Content-Type", "application/json")
                .header("User-Agent", USER_AGENT)
                .header("X-SDK-Language", "java")
                .header("X-Cultural-Context", "Malaysian Healthcare");

            // Add cultural context headers
            if (config.getMalaysianState() != null) {
                requestBuilder.header("X-Malaysian-State", config.getMalaysianState().getCode());
            }
            if (config.getPreferredLanguage() != null) {
                requestBuilder.header("X-Preferred-Language", config.getPreferredLanguage().getCode());
            }
            if (config.isPrayerTimeAware()) {
                requestBuilder.header("X-Prayer-Time-Aware", "true");
            }
            if (config.isHalalRequirements()) {
                requestBuilder.header("X-Halal-Requirements", "true");
            }

            Request request = requestBuilder.build();
            
            if (config.isDebug()) {
                logger.debug("Making {} request to {}", request.method(), request.url());
            }

            Response response = chain.proceed(request);

            // Log cultural context if present
            String prayerTimeHeader = response.header("X-Prayer-Time");
            if (prayerTimeHeader != null) {
                logger.info("🕌 Prayer Time Context: {}", prayerTimeHeader);
            }

            String culturalEventHeader = response.header("X-Cultural-Event");
            if (culturalEventHeader != null) {
                logger.info("🎉 Cultural Event: {}", culturalEventHeader);
            }

            return response;
        });

        return builder.build();
    }

    /**
     * Create JSON object mapper with Malaysian healthcare configurations
     */
    private ObjectMapper createObjectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        return mapper;
    }

    /**
     * Get API health status
     * 
     * @return Health status including cultural services
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getHealth() throws MediMateException {
        return makeGetRequest("/health", Map.class);
    }

    /**
     * Get Malaysian healthcare context information
     * 
     * @return Context information including supported languages and features
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getContext() throws MediMateException {
        return makeGetRequest("/context", Map.class);
    }

    /**
     * Make GET request to API
     * 
     * @param endpoint API endpoint (without base URL)
     * @param responseType Class type for response deserialization
     * @param <T> Response type
     * @return Deserialized response
     * @throws MediMateException if request fails
     */
    public <T> T makeGetRequest(String endpoint, Class<T> responseType) throws MediMateException {
        Request request = new Request.Builder()
            .url(config.getBaseUrl() + endpoint)
            .get()
            .build();

        return executeRequest(request, responseType);
    }

    /**
     * Make POST request to API
     * 
     * @param endpoint API endpoint (without base URL)
     * @param requestBody Request body object
     * @param responseType Class type for response deserialization
     * @param <T> Response type
     * @return Deserialized response
     * @throws MediMateException if request fails
     */
    public <T> T makePostRequest(String endpoint, Object requestBody, Class<T> responseType) 
            throws MediMateException {
        try {
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            RequestBody body = RequestBody.create(jsonBody, MediaType.get("application/json"));

            Request request = new Request.Builder()
                .url(config.getBaseUrl() + endpoint)
                .post(body)
                .build();

            return executeRequest(request, responseType);

        } catch (Exception e) {
            throw new MediMateException("Failed to serialize request body", "SERIALIZATION_ERROR", e);
        }
    }

    /**
     * Execute HTTP request and handle response
     */
    private <T> T executeRequest(Request request, Class<T> responseType) throws MediMateException {
        try (Response response = httpClient.newCall(request).execute()) {
            
            // Handle rate limiting
            if (response.code() == 429) {
                String retryAfter = response.header("Retry-After");
                int seconds = retryAfter != null ? Integer.parseInt(retryAfter) : 60;
                throw new MediMateException(
                    "Rate limited. Retry after " + seconds + " seconds", 
                    "RATE_LIMIT_ERROR"
                );
            }

            // Handle authentication errors
            if (response.code() == 401) {
                throw new MediMateException(
                    "Invalid API key or authentication failed", 
                    "AUTHENTICATION_ERROR"
                );
            }

            if (!response.isSuccessful()) {
                String errorBody = response.body() != null ? response.body().string() : "";
                throw new MediMateException(
                    "HTTP " + response.code() + ": " + response.message() + " - " + errorBody,
                    "HTTP_ERROR"
                );
            }

            String responseBody = response.body() != null ? response.body().string() : "{}";
            return objectMapper.readValue(responseBody, responseType);

        } catch (IOException e) {
            throw new MediMateException("Request execution failed", "REQUEST_ERROR", e);
        }
    }

    // Service getters
    public CulturalService getCultural() {
        return culturalService;
    }

    public PatientService getPatients() {
        return patientService;
    }

    public AppointmentService getAppointments() {
        return appointmentService;
    }

    public MedicationService getMedications() {
        return medicationService;
    }

    public RealtimeService getRealtime() {
        return realtimeService;
    }

    public FhirService getFhir() {
        return fhirService;
    }

    // Configuration getters
    public MediMateConfig getConfig() {
        return config;
    }

    public ObjectMapper getObjectMapper() {
        return objectMapper;
    }

    public OkHttpClient getHttpClient() {
        return httpClient;
    }

    @Override
    public void close() {
        if (httpClient != null) {
            httpClient.dispatcher().executorService().shutdown();
            httpClient.connectionPool().evictAll();
        }
        logger.info("MediMate Malaysia SDK client closed");
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/client/MediMateMalaysiaClient.java`, mainClient);
  }

  generateModels() {
    // Generate enum for Malaysian states
    const malaysianStateEnum = `package ${this.packageName}.model;

/**
 * Malaysian state codes for prayer times and cultural services
 */
public enum MalaysianState {
    KUALA_LUMPUR("KUL", "Kuala Lumpur"),
    SELANGOR("SGR", "Selangor"),
    JOHOR("JHR", "Johor"),
    PENANG("PNG", "Penang"),
    PERAK("PRK", "Perak"),
    PAHANG("PHG", "Pahang"),
    TERENGGANU("TRG", "Terengganu"),
    KELANTAN("KTN", "Kelantan"),
    PERLIS("PLS", "Perlis"),
    KEDAH("KDH", "Kedah"),
    MELAKA("MLK", "Melaka"),
    NEGERI_SEMBILAN("NSN", "Negeri Sembilan"),
    SARAWAK("SWK", "Sarawak"),
    SABAH("SBH", "Sabah");

    private final String code;
    private final String name;

    MalaysianState(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public static MalaysianState fromCode(String code) {
        for (MalaysianState state : values()) {
            if (state.code.equals(code)) {
                return state;
            }
        }
        throw new IllegalArgumentException("Unknown Malaysian state code: " + code);
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/model/MalaysianState.java`, malaysianStateEnum);

    // Generate supported language enum
    const supportedLanguageEnum = `package ${this.packageName}.model;

/**
 * Supported languages for Malaysian healthcare translation
 */
public enum SupportedLanguage {
    MALAY("ms", "Bahasa Malaysia"),
    ENGLISH("en", "English"),
    CHINESE("zh", "Chinese"),
    TAMIL("ta", "Tamil");

    private final String code;
    private final String name;

    SupportedLanguage(String code, String name) {
        this.code = code;
        this.name = name;
    }

    public String getCode() {
        return code;
    }

    public String getName() {
        return name;
    }

    public static SupportedLanguage fromCode(String code) {
        for (SupportedLanguage language : values()) {
            if (language.code.equals(code)) {
                return language;
            }
        }
        throw new IllegalArgumentException("Unsupported language code: " + code);
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/model/SupportedLanguage.java`, supportedLanguageEnum);

    // Generate PrayerTimes model
    const prayerTimesModel = `package ${this.packageName}.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.Map;

/**
 * Prayer times for a Malaysian state with healthcare scheduling considerations
 */
public class PrayerTimesResponse {
    
    @JsonProperty("state_code")
    private String stateCode;
    
    @JsonProperty("state_name")
    private String stateName;
    
    private LocalDate date;
    
    @JsonProperty("prayer_times")
    private Map<String, String> prayerTimes;
    
    @JsonProperty("healthcare_considerations")
    private Map<String, Object> healthcareConsiderations;

    // Constructors
    public PrayerTimesResponse() {}

    public PrayerTimesResponse(String stateCode, String stateName, LocalDate date, 
                             Map<String, String> prayerTimes, Map<String, Object> healthcareConsiderations) {
        this.stateCode = stateCode;
        this.stateName = stateName;
        this.date = date;
        this.prayerTimes = prayerTimes;
        this.healthcareConsiderations = healthcareConsiderations;
    }

    // Getters and Setters
    public String getStateCode() {
        return stateCode;
    }

    public void setStateCode(String stateCode) {
        this.stateCode = stateCode;
    }

    public String getStateName() {
        return stateName;
    }

    public void setStateName(String stateName) {
        this.stateName = stateName;
    }

    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public Map<String, String> getPrayerTimes() {
        return prayerTimes;
    }

    public void setPrayerTimes(Map<String, String> prayerTimes) {
        this.prayerTimes = prayerTimes;
    }

    public Map<String, Object> getHealthcareConsiderations() {
        return healthcareConsiderations;
    }

    public void setHealthcareConsiderations(Map<String, Object> healthcareConsiderations) {
        this.healthcareConsiderations = healthcareConsiderations;
    }

    @Override
    public String toString() {
        return "PrayerTimesResponse{" +
                "stateCode='" + stateCode + '\\'' +
                ", stateName='" + stateName + '\\'' +
                ", date=" + date +
                ", prayerTimes=" + prayerTimes +
                ", healthcareConsiderations=" + healthcareConsiderations +
                '}';
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/model/PrayerTimesResponse.java`, prayerTimesModel);
  }

  generateCulturalService() {
    const culturalService = `package ${this.packageName}.service;

import ${this.packageName}.client.MediMateMalaysiaClient;
import ${this.packageName}.exception.MediMateException;
import ${this.packageName}.model.MalaysianState;
import ${this.packageName}.model.PrayerTimesResponse;
import ${this.packageName}.model.SupportedLanguage;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

/**
 * Cultural Intelligence Service for Malaysian Healthcare
 * 
 * Provides Malaysian cultural services including:
 * - Islamic prayer times for all 13 states
 * - Halal medication validation
 * - Healthcare text translation with cultural context
 * - Ramadan and cultural calendar integration
 */
public class CulturalService {
    
    private static final Logger logger = LoggerFactory.getLogger(CulturalService.class);
    private final MediMateMalaysiaClient client;

    public CulturalService(MediMateMalaysiaClient client) {
        this.client = client;
    }

    /**
     * Get prayer times for a Malaysian state
     * 
     * @param state Malaysian state
     * @param date Optional date (null for today)
     * @return Prayer times with healthcare scheduling considerations
     * @throws MediMateException if request fails
     */
    public PrayerTimesResponse getPrayerTimes(MalaysianState state, LocalDate date) throws MediMateException {
        String endpoint = "/cultural/prayer-times/" + state.getCode();
        
        if (date != null) {
            endpoint += "?date=" + date.toString();
        }

        Map<String, Object> response = client.makeGetRequest(endpoint, Map.class);
        
        // Extract data from response wrapper
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        
        return client.getObjectMapper().convertValue(data, PrayerTimesResponse.class);
    }

    /**
     * Get prayer times for a Malaysian state (today)
     * 
     * @param state Malaysian state
     * @return Prayer times with healthcare scheduling considerations
     * @throws MediMateException if request fails
     */
    public PrayerTimesResponse getPrayerTimes(MalaysianState state) throws MediMateException {
        return getPrayerTimes(state, null);
    }

    /**
     * Get current prayer status for healthcare scheduling
     * 
     * @param state Malaysian state
     * @return Current prayer status with scheduling recommendations
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getCurrentPrayerStatus(MalaysianState state) throws MediMateException {
        String endpoint = "/cultural/prayer-times/" + state.getCode() + "/current";
        Map<String, Object> response = client.makeGetRequest(endpoint, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * Translate healthcare text with cultural context
     * 
     * @param text Text to translate
     * @param targetLanguage Target language
     * @param sourceLanguage Source language (null for auto-detect)
     * @param context Translation context (domain, urgency, etc.)
     * @return Translation with cultural notes
     * @throws MediMateException if request fails
     */
    public Map<String, Object> translate(String text, SupportedLanguage targetLanguage, 
                                       SupportedLanguage sourceLanguage, Map<String, Object> context) 
                                       throws MediMateException {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("text", text);
        requestBody.put("target_language", targetLanguage.getCode());
        
        if (sourceLanguage != null) {
            requestBody.put("source_language", sourceLanguage.getCode());
        }
        
        if (context != null) {
            requestBody.put("context", context);
        }

        Map<String, Object> response = client.makePostRequest("/cultural/translate", requestBody, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * Translate healthcare text (simplified)
     * 
     * @param text Text to translate
     * @param targetLanguage Target language
     * @return Translation result
     * @throws MediMateException if request fails
     */
    public Map<String, Object> translate(String text, SupportedLanguage targetLanguage) 
            throws MediMateException {
        return translate(text, targetLanguage, null, null);
    }

    /**
     * Validate medication for halal compliance
     * 
     * @param medicationName Name of medication
     * @param manufacturer Manufacturer name (optional)
     * @return Halal validation result with certification and alternatives
     * @throws MediMateException if request fails
     */
    public Map<String, Object> validateMedication(String medicationName, String manufacturer) 
            throws MediMateException {
        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("medication_name", medicationName);
        
        if (manufacturer != null && !manufacturer.trim().isEmpty()) {
            requestBody.put("manufacturer", manufacturer);
        }

        Map<String, Object> response = client.makePostRequest("/cultural/halal/validate-medication", 
                                                            requestBody, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * Validate medication for halal compliance (medication name only)
     * 
     * @param medicationName Name of medication
     * @return Halal validation result
     * @throws MediMateException if request fails
     */
    public Map<String, Object> validateMedication(String medicationName) throws MediMateException {
        return validateMedication(medicationName, null);
    }

    /**
     * Get Ramadan information for healthcare scheduling
     * 
     * @param year Year for Ramadan information
     * @return Ramadan dates and healthcare considerations
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getRamadanInfo(int year) throws MediMateException {
        String endpoint = "/cultural/calendar/ramadan/" + year;
        Map<String, Object> response = client.makeGetRequest(endpoint, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * Get supported languages for healthcare translation
     * 
     * @return List of supported languages with capabilities
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getSupportedLanguages() throws MediMateException {
        Map<String, Object> response = client.makeGetRequest("/cultural/languages/supported", Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/service/CulturalService.java`, culturalService);
  }

  generatePatientService() {
    const patientService = `package ${this.packageName}.service;

import ${this.packageName}.client.MediMateMalaysiaClient;
import ${this.packageName}.exception.MediMateException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Patient Management Service with PDPA compliance
 */
public class PatientService {
    
    private static final Logger logger = LoggerFactory.getLogger(PatientService.class);
    private final MediMateMalaysiaClient client;

    public PatientService(MediMateMalaysiaClient client) {
        this.client = client;
    }

    /**
     * Create new patient with Malaysian healthcare context
     * 
     * @param patientData Patient information
     * @return Created patient
     * @throws MediMateException if request fails
     */
    public Map<String, Object> createPatient(Map<String, Object> patientData) throws MediMateException {
        Map<String, Object> response = client.makePostRequest("/patients", patientData, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * Get patient by ID
     * 
     * @param patientId Patient ID
     * @return Patient information
     * @throws MediMateException if request fails
     */
    public Map<String, Object> getPatient(String patientId) throws MediMateException {
        Map<String, Object> response = client.makeGetRequest("/patients/" + patientId, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * List patients with PDPA compliance
     * 
     * @param page Page number (1-based)
     * @param limit Results per page
     * @param search Search query (optional)
     * @return List of patients
     * @throws MediMateException if request fails
     */
    public Map<String, Object> listPatients(int page, int limit, String search) throws MediMateException {
        String endpoint = "/patients?page=" + page + "&limit=" + limit;
        
        if (search != null && !search.trim().isEmpty()) {
            endpoint += "&search=" + search;
        }

        Map<String, Object> response = client.makeGetRequest(endpoint, Map.class);
        
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) response.get("data");
        return data;
    }

    /**
     * List patients (simplified)
     * 
     * @return List of patients (first page, 20 results)
     * @throws MediMateException if request fails
     */
    public Map<String, Object> listPatients() throws MediMateException {
        return listPatients(1, 20, null);
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/service/PatientService.java`, patientService);
  }

  generateUtils() {
    const apiKeyValidator = `package ${this.packageName}.util;

/**
 * Utility class for validating API keys
 */
public class ApiKeyValidator {

    /**
     * Validate MediMate API key format
     * 
     * @param apiKey API key to validate
     * @return true if valid format, false otherwise
     */
    public static boolean isValid(String apiKey) {
        return apiKey != null && 
               apiKey.startsWith("mk_") && 
               apiKey.length() > 12;
    }

    /**
     * Check if API key is for testing environment
     * 
     * @param apiKey API key to check
     * @return true if test key, false otherwise
     */
    public static boolean isTestKey(String apiKey) {
        return apiKey != null && apiKey.startsWith("mk_test_");
    }

    /**
     * Check if API key is for live environment
     * 
     * @param apiKey API key to check
     * @return true if live key, false otherwise
     */
    public static boolean isLiveKey(String apiKey) {
        return apiKey != null && apiKey.startsWith("mk_live_");
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/util/ApiKeyValidator.java`, apiKeyValidator);
  }

  generateExceptions() {
    const mediMateException = `package ${this.packageName}.exception;

import java.util.Map;

/**
 * Base exception for MediMate SDK errors
 */
public class MediMateException extends Exception {

    private final String errorCode;
    private final Map<String, String> culturalMessage;
    private final Object details;

    public MediMateException(String message) {
        super(message);
        this.errorCode = "UNKNOWN_ERROR";
        this.culturalMessage = null;
        this.details = null;
    }

    public MediMateException(String message, String errorCode) {
        super(message);
        this.errorCode = errorCode;
        this.culturalMessage = null;
        this.details = null;
    }

    public MediMateException(String message, String errorCode, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.culturalMessage = null;
        this.details = null;
    }

    public MediMateException(String message, String errorCode, Map<String, String> culturalMessage, Object details) {
        super(message);
        this.errorCode = errorCode;
        this.culturalMessage = culturalMessage;
        this.details = details;
    }

    public String getErrorCode() {
        return errorCode;
    }

    public Map<String, String> getCulturalMessage() {
        return culturalMessage;
    }

    public Object getDetails() {
        return details;
    }

    /**
     * Get message in specified language
     * 
     * @param languageCode Language code (ms, en, zh, ta)
     * @return Localized message or default message
     */
    public String getMessage(String languageCode) {
        if (culturalMessage != null && culturalMessage.containsKey(languageCode)) {
            return culturalMessage.get(languageCode);
        }
        return getMessage();
    }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/exception/MediMateException.java`, mediMateException);
  }

  generateConfiguration() {
    const config = `package ${this.packageName}.config;

import ${this.packageName}.model.MalaysianState;
import ${this.packageName}.model.SupportedLanguage;

/**
 * Configuration for MediMate Malaysia SDK
 */
public class MediMateConfig {
    
    private String apiKey;
    private String baseUrl = "https://api.medimate.my/v1";
    private int connectTimeout = 30;
    private int readTimeout = 30; 
    private int writeTimeout = 30;
    private boolean debug = false;
    
    // Malaysian cultural context
    private MalaysianState malaysianState;
    private SupportedLanguage preferredLanguage;
    private boolean prayerTimeAware = true;
    private boolean halalRequirements = false;
    private boolean ramadanAdjustments = false;

    // Private constructor for builder pattern
    private MediMateConfig() {}

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private MediMateConfig config = new MediMateConfig();

        public Builder apiKey(String apiKey) {
            config.apiKey = apiKey;
            return this;
        }

        public Builder baseUrl(String baseUrl) {
            config.baseUrl = baseUrl;
            return this;
        }

        public Builder connectTimeout(int seconds) {
            config.connectTimeout = seconds;
            return this;
        }

        public Builder readTimeout(int seconds) {
            config.readTimeout = seconds;
            return this;
        }

        public Builder writeTimeout(int seconds) {
            config.writeTimeout = seconds;
            return this;
        }

        public Builder debug(boolean debug) {
            config.debug = debug;
            return this;
        }

        public Builder malaysianState(MalaysianState state) {
            config.malaysianState = state;
            return this;
        }

        public Builder preferredLanguage(SupportedLanguage language) {
            config.preferredLanguage = language;
            return this;
        }

        public Builder prayerTimeAware(boolean aware) {
            config.prayerTimeAware = aware;
            return this;
        }

        public Builder halalRequirements(boolean required) {
            config.halalRequirements = required;
            return this;
        }

        public Builder ramadanAdjustments(boolean adjustments) {
            config.ramadanAdjustments = adjustments;
            return this;
        }

        public MediMateConfig build() {
            if (config.apiKey == null || config.apiKey.trim().isEmpty()) {
                throw new IllegalArgumentException("API key is required");
            }
            return config;
        }
    }

    // Getters
    public String getApiKey() { return apiKey; }
    public String getBaseUrl() { return baseUrl; }
    public int getConnectTimeout() { return connectTimeout; }
    public int getReadTimeout() { return readTimeout; }
    public int getWriteTimeout() { return writeTimeout; }
    public boolean isDebug() { return debug; }
    public MalaysianState getMalaysianState() { return malaysianState; }
    public SupportedLanguage getPreferredLanguage() { return preferredLanguage; }
    public boolean isPrayerTimeAware() { return prayerTimeAware; }
    public boolean isHalalRequirements() { return halalRequirements; }
    public boolean isRamadanAdjustments() { return ramadanAdjustments; }
}`;

    this.writeFile(`src/main/java/${this.packagePath}/config/MediMateConfig.java`, config);
  }

  generateExamples() {
    const example = `package ${this.packageName}.example;

import ${this.packageName}.client.MediMateMalaysiaClient;
import ${this.packageName}.config.MediMateConfig;
import ${this.packageName}.model.MalaysianState;
import ${this.packageName}.model.PrayerTimesResponse;
import ${this.packageName}.model.SupportedLanguage;
import ${this.packageName}.exception.MediMateException;

import java.util.Map;

/**
 * Basic usage examples for MediMate Malaysia SDK
 */
public class BasicUsageExample {

    public static void main(String[] args) {
        // Configure with Malaysian cultural context
        MediMateConfig config = MediMateConfig.builder()
            .apiKey("mk_test_your_api_key_here") // Replace with your actual API key
            .malaysianState(MalaysianState.KUALA_LUMPUR)
            .preferredLanguage(SupportedLanguage.MALAY)
            .prayerTimeAware(true)
            .halalRequirements(true)
            .debug(true)
            .build();

        try (MediMateMalaysiaClient client = new MediMateMalaysiaClient(config)) {
            
            // Example 1: Get prayer times for Kuala Lumpur
            System.out.println("=== Prayer Times Example ===");
            PrayerTimesResponse prayerTimes = client.getCultural()
                .getPrayerTimes(MalaysianState.KUALA_LUMPUR);
            
            System.out.println("State: " + prayerTimes.getStateName());
            System.out.println("Date: " + prayerTimes.getDate());
            System.out.println("Maghrib: " + prayerTimes.getPrayerTimes().get("maghrib"));
            
            // Example 2: Validate halal medication
            System.out.println("\\n=== Halal Validation Example ===");
            Map<String, Object> halalResult = client.getCultural()
                .validateMedication("Paracetamol 500mg", "Duopharma Biotech");
            
            System.out.println("Medication: " + halalResult.get("medication_name"));
            System.out.println("Halal Status: " + halalResult.get("halal_status"));
            
            // Example 3: Translate healthcare text
            System.out.println("\\n=== Translation Example ===");
            Map<String, Object> translation = client.getCultural()
                .translate("Take this medication twice daily after meals", SupportedLanguage.MALAY);
            
            System.out.println("Original: " + translation.get("original_text"));
            System.out.println("Translation: " + translation.get("translated_text"));
            System.out.println("Confidence: " + translation.get("confidence_score"));
            
            // Example 4: Get API health status
            System.out.println("\\n=== Health Check Example ===");
            Map<String, Object> health = client.getHealth();
            System.out.println("API Status: " + health.get("status"));
            
            // Example 5: Get current prayer status
            System.out.println("\\n=== Current Prayer Status Example ===");
            Map<String, Object> currentPrayer = client.getCultural()
                .getCurrentPrayerStatus(MalaysianState.KUALA_LUMPUR);
            
            System.out.println("Current Prayer: " + currentPrayer.get("current_prayer"));
            System.out.println("Scheduling Status: " + currentPrayer.get("healthcare_scheduling_status"));

        } catch (MediMateException e) {
            System.err.println("Error: " + e.getMessage());
            System.err.println("Error Code: " + e.getErrorCode());
            
            // Display cultural message if available
            if (e.getCulturalMessage() != null) {
                String malayMessage = e.getMessage("ms");
                if (malayMessage != null) {
                    System.err.println("Malay: " + malayMessage);
                }
            }
            
            e.printStackTrace();
        }
    }
}`;

    this.writeFile(`examples/BasicUsageExample.java`, example);
  }

  generateTests() {
    const test = `package ${this.packageName}.client;

import ${this.packageName}.config.MediMateConfig;
import ${this.packageName}.exception.MediMateException;
import ${this.packageName}.model.MalaysianState;
import ${this.packageName}.model.SupportedLanguage;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests for MediMateMalaysiaClient
 */
public class MediMateMalaysiaClientTest {

    private MediMateMalaysiaClient client;
    private MediMateConfig config;

    @BeforeEach
    public void setUp() {
        config = MediMateConfig.builder()
            .apiKey("mk_test_fake_key_for_testing")
            .malaysianState(MalaysianState.KUALA_LUMPUR)
            .preferredLanguage(SupportedLanguage.MALAY)
            .debug(true)
            .build();
            
        client = new MediMateMalaysiaClient(config);
    }

    @AfterEach
    public void tearDown() {
        if (client != null) {
            client.close();
        }
    }

    @Test
    public void testClientInitialization() {
        assertNotNull(client);
        assertEquals(config.getApiKey(), client.getConfig().getApiKey());
        assertEquals(MalaysianState.KUALA_LUMPUR, client.getConfig().getMalaysianState());
    }

    @Test
    public void testInvalidApiKey() {
        assertThrows(MediMateException.class, () -> {
            MediMateConfig invalidConfig = MediMateConfig.builder()
                .apiKey("invalid_key")
                .build();
                
            new MediMateMalaysiaClient(invalidConfig);
        });
    }

    @Test
    public void testNullConfig() {
        assertThrows(MediMateException.class, () -> {
            new MediMateMalaysiaClient(null);
        });
    }

    @Test
    public void testServiceInstances() {
        assertNotNull(client.getCultural());
        assertNotNull(client.getPatients());
        assertNotNull(client.getAppointments());
        assertNotNull(client.getMedications());
        assertNotNull(client.getRealtime());
        assertNotNull(client.getFhir());
    }

    // Note: Additional integration tests would require actual API endpoints
    // These would typically be run against a test server or with mocked responses
}`;

    this.writeFile(`src/test/java/${this.packagePath}/client/MediMateMalaysiaClientTest.java`, test);
  }

  generateReadme() {
    const readme = `# MediMate Malaysia Healthcare API - Java SDK

Official Java SDK for MediMate Malaysia Healthcare API with comprehensive Malaysian cultural intelligence features.

## 🇲🇾 Malaysian Healthcare Features

- **Prayer Time Integration**: Real-time prayer times for all 13 Malaysian states
- **Halal Medication Validation**: JAKIM-certified halal medication checking  
- **Multi-Language Support**: Bahasa Malaysia, English, Chinese, Tamil
- **PDPA 2010 Compliance**: Built-in Malaysian data protection compliance
- **Cultural Calendar**: Ramadan, Eid, and Malaysian cultural event integration
- **Real-time Notifications**: WebSocket support with cultural context

## Installation

### Maven

\`\`\`xml
<dependency>
    <groupId>${SDK_CONFIG.groupId}</groupId>
    <artifactId>${SDK_CONFIG.artifactId}</artifactId>
    <version>${SDK_CONFIG.version}</version>
</dependency>
\`\`\`

### Gradle

\`\`\`gradle
implementation '${SDK_CONFIG.groupId}:${SDK_CONFIG.artifactId}:${SDK_CONFIG.version}'
\`\`\`

## Quick Start

\`\`\`java
import ${this.packageName}.client.MediMateMalaysiaClient;
import ${this.packageName}.config.MediMateConfig;
import ${this.packageName}.model.MalaysianState;
import ${this.packageName}.model.SupportedLanguage;
import ${this.packageName}.model.PrayerTimesResponse;

public class Example {
    public static void main(String[] args) {
        // Configure with Malaysian cultural context
        MediMateConfig config = MediMateConfig.builder()
            .apiKey("mk_live_your_key_here")
            .malaysianState(MalaysianState.KUALA_LUMPUR)
            .preferredLanguage(SupportedLanguage.MALAY)
            .prayerTimeAware(true)
            .halalRequirements(true)
            .build();

        try (MediMateMalaysiaClient client = new MediMateMalaysiaClient(config)) {
            
            // Get prayer times
            PrayerTimesResponse prayerTimes = client.getCultural()
                .getPrayerTimes(MalaysianState.KUALA_LUMPUR);
            System.out.println("Maghrib: " + prayerTimes.getPrayerTimes().get("maghrib"));

            // Validate halal medication
            Map<String, Object> halalResult = client.getCultural()
                .validateMedication("Paracetamol 500mg", "Duopharma Biotech");
            System.out.println("Halal Status: " + halalResult.get("halal_status"));

            // Translate healthcare text
            Map<String, Object> translation = client.getCultural()
                .translate("Take medication twice daily", SupportedLanguage.MALAY);
            System.out.println("Translation: " + translation.get("translated_text"));

        } catch (MediMateException e) {
            System.err.println("Error: " + e.getMessage());
        }
    }
}
\`\`\`

## Configuration

\`\`\`java
MediMateConfig config = MediMateConfig.builder()
    .apiKey("your_api_key")                           // Required
    .baseUrl("https://api.medimate.my/v1")           // Optional (default)
    .connectTimeout(30)                               // Seconds (default: 30)
    .readTimeout(30)                                  // Seconds (default: 30)  
    .writeTimeout(30)                                 // Seconds (default: 30)
    .debug(true)                                      // Enable debug logging
    .malaysianState(MalaysianState.KUALA_LUMPUR)     // Cultural context
    .preferredLanguage(SupportedLanguage.MALAY)      // Language preference
    .prayerTimeAware(true)                            // Prayer time integration
    .halalRequirements(true)                          // Halal medication filtering
    .ramadanAdjustments(true)                         // Ramadan scheduling
    .build();
\`\`\`

## Malaysian States

\`\`\`java
// All Malaysian states are supported
MalaysianState.KUALA_LUMPUR     // KUL
MalaysianState.SELANGOR         // SGR  
MalaysianState.JOHOR           // JHR
MalaysianState.PENANG          // PNG
MalaysianState.PERAK           // PRK
MalaysianState.PAHANG          // PHG
MalaysianState.TERENGGANU      // TRG
MalaysianState.KELANTAN        // KTN
MalaysianState.PERLIS          // PLS
MalaysianState.KEDAH           // KDH
MalaysianState.MELAKA          // MLK
MalaysianState.NEGERI_SEMBILAN // NSN
MalaysianState.SARAWAK         // SWK
MalaysianState.SABAH           // SBH
\`\`\`

## Services

### Cultural Intelligence Service

\`\`\`java
// Prayer times with healthcare scheduling
PrayerTimesResponse prayerTimes = client.getCultural()
    .getPrayerTimes(MalaysianState.KUALA_LUMPUR);

Map<String, Object> currentStatus = client.getCultural()
    .getCurrentPrayerStatus(MalaysianState.KUALA_LUMPUR);

// Healthcare translation
Map<String, Object> translation = client.getCultural()
    .translate("Please fast before blood test", SupportedLanguage.MALAY);

// Halal medication validation
Map<String, Object> halalCheck = client.getCultural()
    .validateMedication("Insulin injection", "Novo Nordisk");

// Ramadan healthcare considerations
Map<String, Object> ramadanInfo = client.getCultural()
    .getRamadanInfo(2024);
\`\`\`

### Patient Management

\`\`\`java
// Create patient with cultural preferences
Map<String, Object> patientData = new HashMap<>();
// ... populate patient data

Map<String, Object> patient = client.getPatients()
    .createPatient(patientData);

// Get patient by ID
Map<String, Object> patient = client.getPatients()
    .getPatient("patient-id");

// List patients
Map<String, Object> patients = client.getPatients()
    .listPatients(1, 20, "search query");
\`\`\`

## Error Handling

\`\`\`java
try {
    PrayerTimesResponse prayerTimes = client.getCultural()
        .getPrayerTimes(MalaysianState.KUALA_LUMPUR);
        
} catch (MediMateException e) {
    System.err.println("Error Code: " + e.getErrorCode());
    System.err.println("Message: " + e.getMessage());
    
    // Get localized error message
    String malayMessage = e.getMessage("ms");
    if (malayMessage != null) {
        System.err.println("Malay: " + malayMessage);  
    }
}
\`\`\`

## Spring Boot Integration

\`\`\`java
@Configuration
public class MediMateConfiguration {

    @Bean
    public MediMateMalaysiaClient mediMateClient(
        @Value("\${medimate.api.key}") String apiKey) {
        
        MediMateConfig config = MediMateConfig.builder()
            .apiKey(apiKey)
            .malaysianState(MalaysianState.KUALA_LUMPUR)
            .preferredLanguage(SupportedLanguage.MALAY)
            .prayerTimeAware(true)
            .halalRequirements(true)
            .build();
            
        return new MediMateMalaysiaClient(config);
    }
}

@Service
public class HealthcareService {
    
    @Autowired
    private MediMateMalaysiaClient mediMateClient;
    
    public PrayerTimesResponse getPrayerTimes() {
        return mediMateClient.getCultural()
            .getPrayerTimes(MalaysianState.KUALA_LUMPUR);
    }
}
\`\`\`

## Requirements

- Java ${SDK_CONFIG.javaVersion}+
- Maven 3.6+ or Gradle 6.0+

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.medimate.my/java-sdk
- GitHub Issues: https://github.com/medimate-malaysia/java-sdk/issues
- Email: sdk@medimate.my

---

🇲🇾 **Designed for Malaysian Healthcare** - Supporting Malaysian cultural and religious requirements in healthcare technology.
`;

    this.writeFile('README.md', readme);
  }

  writeFile(filepath, content) {
    const fullPath = path.join(this.outputDir, filepath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content);
  }
}

// Generate the SDK
if (require.main === module) {
  // Load OpenAPI spec (you would load this from the actual file)
  const openApiSpec = {};
  
  const generator = new JavaSDKGenerator(openApiSpec);
  generator.generate();
}