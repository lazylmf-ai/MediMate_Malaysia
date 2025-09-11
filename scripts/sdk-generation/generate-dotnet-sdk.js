#!/usr/bin/env node

/**
 * .NET C# SDK Generator for MediMate Malaysia Healthcare API
 * Generates a comprehensive .NET SDK with Malaysian cultural intelligence features
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// SDK configuration
const SDK_CONFIG = {
  packageId: 'MediMate.Malaysia.SDK',
  version: '1.1.8',
  title: 'MediMate Malaysia Healthcare SDK',
  description: 'Official .NET SDK for MediMate Malaysia Healthcare API with cultural intelligence',
  authors: 'MediMate Malaysia',
  company: 'MediMate Malaysia',
  copyright: 'Copyright (c) 2024 MediMate Malaysia',
  repositoryUrl: 'https://github.com/medimate-malaysia/dotnet-sdk',
  projectUrl: 'https://api.medimate.my',
  licenseExpression: 'MIT',
  targetFramework: 'net6.0',
  nugetTags: 'medimate malaysia healthcare api sdk cultural-intelligence pdpa halal prayer-times fhir'
};

class DotNetSDKGenerator {
  constructor(openApiSpec) {
    this.spec = openApiSpec;
    this.outputDir = path.join(__dirname, '../../sdks/dotnet');
    this.namespace = 'MediMate.Malaysia.SDK';
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Create .NET SDK directory structure
    const dirs = [
      'src/MediMate.Malaysia.SDK',
      'src/MediMate.Malaysia.SDK/Client',
      'src/MediMate.Malaysia.SDK/Models',
      'src/MediMate.Malaysia.SDK/Services',
      'src/MediMate.Malaysia.SDK/Configuration',
      'src/MediMate.Malaysia.SDK/Exceptions',
      'src/MediMate.Malaysia.SDK/Utils',
      'tests/MediMate.Malaysia.SDK.Tests',
      'examples',
      'docs'
    ];

    dirs.forEach(dir => {
      const fullPath = path.join(this.outputDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generate() {
    console.log('🚀 Generating .NET SDK for MediMate Malaysia...');
    
    this.generateProjectFile();
    this.generateSolutionFile();
    this.generateMainClient();
    this.generateModels();
    this.generateConfiguration();
    this.generateCulturalService();
    this.generatePatientService();
    this.generateExceptions();
    this.generateUtils();
    this.generateExamples();
    this.generateTests();
    this.generateReadme();
    this.generateNuGetConfig();
    
    console.log('✅ .NET SDK generated successfully!');
    console.log(`📁 Output directory: ${this.outputDir}`);
  }

  generateProjectFile() {
    const projectFile = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>${SDK_CONFIG.targetFramework}</TargetFramework>
    <PackageId>${SDK_CONFIG.packageId}</PackageId>
    <Version>${SDK_CONFIG.version}</Version>
    <Title>${SDK_CONFIG.title}</Title>
    <Description>${SDK_CONFIG.description}</Description>
    <Authors>${SDK_CONFIG.authors}</Authors>
    <Company>${SDK_CONFIG.company}</Company>
    <Copyright>${SDK_CONFIG.copyright}</Copyright>
    <PackageProjectUrl>${SDK_CONFIG.projectUrl}</PackageProjectUrl>
    <RepositoryUrl>${SDK_CONFIG.repositoryUrl}</RepositoryUrl>
    <RepositoryType>git</RepositoryType>
    <PackageLicenseExpression>${SDK_CONFIG.licenseExpression}</PackageLicenseExpression>
    <PackageTags>${SDK_CONFIG.nugetTags}</PackageTags>
    <PackageIcon>icon.png</PackageIcon>
    <PackageReadmeFile>README.md</PackageReadmeFile>
    <GeneratePackageOnBuild>true</GeneratePackageOnBuild>
    <GenerateDocumentationFile>true</GenerateDocumentationFile>
    <DocumentationFile>bin\\$(Configuration)\\$(TargetFramework)\\$(AssemblyName).xml</DocumentationFile>
    <LangVersion>latest</LangVersion>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
  </PropertyGroup>

  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Debug|AnyCPU'">
    <DefineConstants>DEBUG;TRACE</DefineConstants>
  </PropertyGroup>

  <PropertyGroup Condition="'$(Configuration)|$(Platform)'=='Release|AnyCPU'">
    <Optimize>true</Optimize>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.Extensions.DependencyInjection.Abstractions" Version="7.0.0" />
    <PackageReference Include="Microsoft.Extensions.Http" Version="7.0.0" />
    <PackageReference Include="Microsoft.Extensions.Logging.Abstractions" Version="7.0.1" />
    <PackageReference Include="Microsoft.Extensions.Options" Version="7.0.1" />
    <PackageReference Include="System.Net.Http.Json" Version="7.0.1" />
    <PackageReference Include="System.Text.Json" Version="7.0.3" />
    <PackageReference Include="System.ComponentModel.Annotations" Version="5.0.0" />
    <PackageReference Include="System.Net.WebSockets.Client" Version="4.3.2" />
    <PackageReference Include="Microsoft.AspNetCore.SignalR.Client" Version="7.0.9" />
  </ItemGroup>

  <ItemGroup>
    <None Include="..\\..\\README.md" Pack="true" PackagePath="\\" />
    <None Include="..\\..\\icon.png" Pack="true" PackagePath="\\" />
  </ItemGroup>

  <ItemGroup>
    <AssemblyAttribute Include="System.Runtime.CompilerServices.InternalsVisibleTo">
      <_Parameter1>MediMate.Malaysia.SDK.Tests</_Parameter1>
    </AssemblyAttribute>
  </ItemGroup>

</Project>`;

    this.writeFile('src/MediMate.Malaysia.SDK/MediMate.Malaysia.SDK.csproj', projectFile);
  }

  generateSolutionFile() {
    const solutionFile = `Microsoft Visual Studio Solution File, Format Version 12.00
# Visual Studio Version 17
VisualStudioVersion = 17.0.31903.59
MinimumVisualStudioVersion = 10.0.40219.1

Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "MediMate.Malaysia.SDK", "src\\MediMate.Malaysia.SDK\\MediMate.Malaysia.SDK.csproj", "{12345678-1234-1234-1234-123456789012}"
EndProject

Project("{9A19103F-16F7-4668-BE54-9A1E7A4F7556}") = "MediMate.Malaysia.SDK.Tests", "tests\\MediMate.Malaysia.SDK.Tests\\MediMate.Malaysia.SDK.Tests.csproj", "{12345678-1234-1234-1234-123456789013}"
EndProject

Global
	GlobalSection(SolutionConfigurationPlatforms) = preSolution
		Debug|Any CPU = Debug|Any CPU
		Release|Any CPU = Release|Any CPU
	EndGlobalSection
	GlobalSection(ProjectConfigurationPlatforms) = postSolution
		{12345678-1234-1234-1234-123456789012}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{12345678-1234-1234-1234-123456789012}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{12345678-1234-1234-1234-123456789012}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{12345678-1234-1234-1234-123456789012}.Release|Any CPU.Build.0 = Release|Any CPU
		{12345678-1234-1234-1234-123456789013}.Debug|Any CPU.ActiveCfg = Debug|Any CPU
		{12345678-1234-1234-1234-123456789013}.Debug|Any CPU.Build.0 = Debug|Any CPU
		{12345678-1234-1234-1234-123456789013}.Release|Any CPU.ActiveCfg = Release|Any CPU
		{12345678-1234-1234-1234-123456789013}.Release|Any CPU.Build.0 = Release|Any CPU
	EndGlobalSection
	GlobalSection(SolutionProperties) = preSolution
		HideSolutionNode = FALSE
	EndGlobalSection
	GlobalSection(ExtensibilityGlobals) = postSolution
		SolutionGuid = {12345678-1234-1234-1234-123456789014}
	EndGlobalSection
EndGlobal`;

    this.writeFile('MediMate.Malaysia.SDK.sln', solutionFile);
  }

  generateMainClient() {
    const mainClient = `using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using MediMate.Malaysia.SDK.Configuration;
using MediMate.Malaysia.SDK.Exceptions;
using MediMate.Malaysia.SDK.Models;
using MediMate.Malaysia.SDK.Services;
using MediMate.Malaysia.SDK.Utils;

namespace MediMate.Malaysia.SDK.Client;

/// <summary>
/// MediMate Malaysia Healthcare API Client
/// 
/// Official .NET SDK with Malaysian cultural intelligence features including:
/// - Prayer time integration for all 13 Malaysian states
/// - Halal medication validation with JAKIM certification
/// - Multi-language support (Bahasa Malaysia, English, Chinese, Tamil)
/// - PDPA 2010 compliance framework
/// - Real-time SignalR notifications
/// - HL7 FHIR R4 compatibility
/// </summary>
/// <example>
/// <code>
/// var config = new MediMateConfig
/// {
///     ApiKey = "mk_live_your_key_here",
///     MalaysianState = MalaysianState.KualaLumpur,
///     PreferredLanguage = SupportedLanguage.Malay,
///     PrayerTimeAware = true,
///     HalalRequirements = true
/// };
/// 
/// using var client = new MediMateMalaysiaClient(config);
/// 
/// // Get prayer times
/// var prayerTimes = await client.Cultural.GetPrayerTimesAsync(MalaysianState.KualaLumpur);
/// 
/// // Validate halal medication
/// var halalResult = await client.Cultural.ValidateMedicationAsync("Paracetamol 500mg", "Duopharma Biotech");
/// </code>
/// </example>
public class MediMateMalaysiaClient : IDisposable, IAsyncDisposable
{
    private const string SdkVersion = "${SDK_CONFIG.version}";
    private const string UserAgent = $"MediMate-Malaysia-SDK-DotNet/{SdkVersion}";
    
    private readonly HttpClient _httpClient;
    private readonly MediMateConfig _config;
    private readonly ILogger<MediMateMalaysiaClient>? _logger;
    private readonly JsonSerializerOptions _jsonOptions;
    private bool _disposed;

    /// <summary>
    /// Cultural Intelligence service for Malaysian healthcare
    /// </summary>
    public ICulturalService Cultural { get; }

    /// <summary>
    /// Patient management service with PDPA compliance
    /// </summary>
    public IPatientService Patients { get; }

    /// <summary>
    /// Appointment management service with cultural considerations
    /// </summary>
    public IAppointmentService Appointments { get; }

    /// <summary>
    /// Medication management service with halal validation
    /// </summary>
    public IMedicationService Medications { get; }

    /// <summary>
    /// Real-time notification service with cultural context
    /// </summary>
    public IRealtimeService Realtime { get; }

    /// <summary>
    /// FHIR integration service with Malaysian profiles
    /// </summary>
    public IFhirService Fhir { get; }

    /// <summary>
    /// Initialize a new MediMate Malaysia API client
    /// </summary>
    /// <param name="config">Configuration including API key and cultural context</param>
    /// <param name="httpClient">Optional HttpClient instance</param>
    /// <param name="logger">Optional logger instance</param>
    /// <exception cref="ArgumentNullException">When config is null</exception>
    /// <exception cref="MediMateException">When configuration is invalid</exception>
    public MediMateMalaysiaClient(
        MediMateConfig config,
        HttpClient? httpClient = null,
        ILogger<MediMateMalaysiaClient>? logger = null)
    {
        _config = config ?? throw new ArgumentNullException(nameof(config));
        _logger = logger;

        // Validate API key
        if (!ApiKeyValidator.IsValid(config.ApiKey))
        {
            throw new MediMateException(
                "Invalid API key format. Expected format: mk_live_... or mk_test_...",
                "INVALID_API_KEY");
        }

        // Setup HTTP client
        _httpClient = httpClient ?? new HttpClient();
        ConfigureHttpClient();

        // Setup JSON options
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            PropertyNameCaseInsensitive = true,
            DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
        };

        // Initialize services
        Cultural = new CulturalService(this, _logger?.CreateLogger<CulturalService>());
        Patients = new PatientService(this, _logger?.CreateLogger<PatientService>());
        Appointments = new AppointmentService(this, _logger?.CreateLogger<AppointmentService>());
        Medications = new MedicationService(this, _logger?.CreateLogger<MedicationService>());
        Realtime = new RealtimeService(this, _logger?.CreateLogger<RealtimeService>());
        Fhir = new FhirService(this, _logger?.CreateLogger<FhirService>());

        _logger?.LogInformation(
            "MediMate Malaysia SDK initialized with API key: {ApiKeyPrefix}...",
            config.ApiKey[..Math.Min(12, config.ApiKey.Length)]);
    }

    private void ConfigureHttpClient()
    {
        _httpClient.BaseAddress = new Uri(_config.BaseUrl);
        _httpClient.Timeout = TimeSpan.FromSeconds(_config.TimeoutSeconds);

        // Clear existing headers
        _httpClient.DefaultRequestHeaders.Clear();

        // Add authentication and basic headers
        _httpClient.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", _config.ApiKey);
        _httpClient.DefaultRequestHeaders.Add("User-Agent", UserAgent);
        _httpClient.DefaultRequestHeaders.Add("X-SDK-Language", "dotnet");
        _httpClient.DefaultRequestHeaders.Add("X-Cultural-Context", "Malaysian Healthcare");

        // Add cultural context headers
        if (_config.MalaysianState.HasValue)
        {
            _httpClient.DefaultRequestHeaders.Add("X-Malaysian-State", 
                _config.MalaysianState.Value.GetCode());
        }

        if (_config.PreferredLanguage.HasValue)
        {
            _httpClient.DefaultRequestHeaders.Add("X-Preferred-Language", 
                _config.PreferredLanguage.Value.GetCode());
        }

        if (_config.PrayerTimeAware)
        {
            _httpClient.DefaultRequestHeaders.Add("X-Prayer-Time-Aware", "true");
        }

        if (_config.HalalRequirements)
        {
            _httpClient.DefaultRequestHeaders.Add("X-Halal-Requirements", "true");
        }

        // Accept JSON
        _httpClient.DefaultRequestHeaders.Accept.Clear();
        _httpClient.DefaultRequestHeaders.Accept.Add(
            new MediaTypeWithQualityHeaderValue("application/json"));
    }

    /// <summary>
    /// Get API health status
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Health status including cultural services</returns>
    public async Task<ApiResponse<HealthStatus>> GetHealthAsync(
        CancellationToken cancellationToken = default)
    {
        return await GetAsync<HealthStatus>("/health", cancellationToken);
    }

    /// <summary>
    /// Get Malaysian healthcare context information
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Context information including supported languages and features</returns>
    public async Task<ApiResponse<MalaysianContext>> GetContextAsync(
        CancellationToken cancellationToken = default)
    {
        return await GetAsync<MalaysianContext>("/context", cancellationToken);
    }

    /// <summary>
    /// Make GET request to API
    /// </summary>
    /// <typeparam name="T">Response type</typeparam>
    /// <param name="endpoint">API endpoint</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>API response</returns>
    public async Task<ApiResponse<T>> GetAsync<T>(
        string endpoint,
        CancellationToken cancellationToken = default)
    {
        return await SendRequestAsync<T>(HttpMethod.Get, endpoint, null, cancellationToken);
    }

    /// <summary>
    /// Make POST request to API
    /// </summary>
    /// <typeparam name="T">Response type</typeparam>
    /// <param name="endpoint">API endpoint</param>
    /// <param name="requestBody">Request body</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>API response</returns>
    public async Task<ApiResponse<T>> PostAsync<T>(
        string endpoint,
        object? requestBody = null,
        CancellationToken cancellationToken = default)
    {
        return await SendRequestAsync<T>(HttpMethod.Post, endpoint, requestBody, cancellationToken);
    }

    /// <summary>
    /// Send HTTP request to API
    /// </summary>
    private async Task<ApiResponse<T>> SendRequestAsync<T>(
        HttpMethod method,
        string endpoint,
        object? requestBody,
        CancellationToken cancellationToken)
    {
        try
        {
            if (_config.Debug)
            {
                _logger?.LogDebug("Making {Method} request to {Endpoint}", method, endpoint);
            }

            using var request = new HttpRequestMessage(method, endpoint);

            if (requestBody != null && (method == HttpMethod.Post || method == HttpMethod.Put))
            {
                var jsonContent = JsonSerializer.Serialize(requestBody, _jsonOptions);
                request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
            }

            using var response = await _httpClient.SendAsync(request, cancellationToken);

            // Log cultural context if present
            if (response.Headers.TryGetValues("X-Prayer-Time", out var prayerTimeValues))
            {
                _logger?.LogInformation("🕌 Prayer Time Context: {PrayerTime}", 
                    prayerTimeValues.FirstOrDefault());
            }

            if (response.Headers.TryGetValues("X-Cultural-Event", out var culturalEventValues))
            {
                _logger?.LogInformation("🎉 Cultural Event: {CulturalEvent}", 
                    culturalEventValues.FirstOrDefault());
            }

            // Handle rate limiting
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                var retryAfterHeader = response.Headers.RetryAfter?.Delta?.TotalSeconds ?? 60;
                throw new MediMateRateLimitException(
                    $"Rate limited. Retry after {retryAfterHeader} seconds",
                    (int)retryAfterHeader);
            }

            // Handle authentication errors
            if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                throw new MediMateAuthenticationException("Invalid API key or authentication failed");
            }

            // Handle other HTTP errors
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new MediMateHttpException(
                    $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase} - {errorContent}",
                    response.StatusCode);
            }

            // Parse response
            var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
            
            if (string.IsNullOrEmpty(responseContent))
            {
                return new ApiResponse<T> { Success = true };
            }

            var apiResponse = JsonSerializer.Deserialize<ApiResponse<T>>(responseContent, _jsonOptions);
            return apiResponse ?? new ApiResponse<T> { Success = true };
        }
        catch (TaskCanceledException ex) when (ex.InnerException is TimeoutException)
        {
            throw new MediMateException("Request timeout", "TIMEOUT_ERROR", ex);
        }
        catch (HttpRequestException ex)
        {
            throw new MediMateException($"Network error: {ex.Message}", "NETWORK_ERROR", ex);
        }
        catch (MediMateException)
        {
            throw; // Re-throw MediMate exceptions as-is
        }
        catch (Exception ex)
        {
            throw new MediMateException($"Unexpected error: {ex.Message}", "UNEXPECTED_ERROR", ex);
        }
    }

    /// <summary>
    /// Get the underlying HttpClient (for advanced scenarios)
    /// </summary>
    public HttpClient HttpClient => _httpClient;

    /// <summary>
    /// Get the configuration
    /// </summary>
    public MediMateConfig Config => _config;

    /// <summary>
    /// Get the JSON serializer options
    /// </summary>
    public JsonSerializerOptions JsonOptions => _jsonOptions;

    public void Dispose()
    {
        Dispose(true);
        GC.SuppressFinalize(this);
    }

    public async ValueTask DisposeAsync()
    {
        await DisposeAsyncCore();
        Dispose(false);
        GC.SuppressFinalize(this);
    }

    protected virtual void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _httpClient?.Dispose();
            _logger?.LogInformation("MediMate Malaysia SDK client disposed");
        }
        _disposed = true;
    }

    protected virtual async ValueTask DisposeAsyncCore()
    {
        if (_httpClient is not null)
        {
            _httpClient.Dispose();
        }

        await Task.CompletedTask;
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Client/MediMateMalaysiaClient.cs', mainClient);
  }

  generateModels() {
    // Malaysian State enum
    const malaysianState = `namespace MediMate.Malaysia.SDK.Models;

/// <summary>
/// Malaysian state codes for prayer times and cultural services
/// </summary>
public enum MalaysianState
{
    /// <summary>Kuala Lumpur (KUL)</summary>
    KualaLumpur,
    
    /// <summary>Selangor (SGR)</summary>
    Selangor,
    
    /// <summary>Johor (JHR)</summary>
    Johor,
    
    /// <summary>Penang (PNG)</summary>
    Penang,
    
    /// <summary>Perak (PRK)</summary>
    Perak,
    
    /// <summary>Pahang (PHG)</summary>
    Pahang,
    
    /// <summary>Terengganu (TRG)</summary>
    Terengganu,
    
    /// <summary>Kelantan (KTN)</summary>
    Kelantan,
    
    /// <summary>Perlis (PLS)</summary>
    Perlis,
    
    /// <summary>Kedah (KDH)</summary>
    Kedah,
    
    /// <summary>Melaka (MLK)</summary>
    Melaka,
    
    /// <summary>Negeri Sembilan (NSN)</summary>
    NegeriSembilan,
    
    /// <summary>Sarawak (SWK)</summary>
    Sarawak,
    
    /// <summary>Sabah (SBH)</summary>
    Sabah
}

/// <summary>
/// Extension methods for MalaysianState enum
/// </summary>
public static class MalaysianStateExtensions
{
    /// <summary>
    /// Get the state code
    /// </summary>
    public static string GetCode(this MalaysianState state) => state switch
    {
        MalaysianState.KualaLumpur => "KUL",
        MalaysianState.Selangor => "SGR",
        MalaysianState.Johor => "JHR",
        MalaysianState.Penang => "PNG",
        MalaysianState.Perak => "PRK",
        MalaysianState.Pahang => "PHG",
        MalaysianState.Terengganu => "TRG",
        MalaysianState.Kelantan => "KTN",
        MalaysianState.Perlis => "PLS",
        MalaysianState.Kedah => "KDH",
        MalaysianState.Melaka => "MLK",
        MalaysianState.NegeriSembilan => "NSN",
        MalaysianState.Sarawak => "SWK",
        MalaysianState.Sabah => "SBH",
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    /// <summary>
    /// Get the state name
    /// </summary>
    public static string GetName(this MalaysianState state) => state switch
    {
        MalaysianState.KualaLumpur => "Kuala Lumpur",
        MalaysianState.Selangor => "Selangor",
        MalaysianState.Johor => "Johor",
        MalaysianState.Penang => "Penang",
        MalaysianState.Perak => "Perak",
        MalaysianState.Pahang => "Pahang",
        MalaysianState.Terengganu => "Terengganu",
        MalaysianState.Kelantan => "Kelantan",
        MalaysianState.Perlis => "Perlis",
        MalaysianState.Kedah => "Kedah",
        MalaysianState.Melaka => "Melaka",
        MalaysianState.NegeriSembilan => "Negeri Sembilan",
        MalaysianState.Sarawak => "Sarawak",
        MalaysianState.Sabah => "Sabah",
        _ => throw new ArgumentOutOfRangeException(nameof(state), state, null)
    };

    /// <summary>
    /// Parse state from code
    /// </summary>
    public static MalaysianState FromCode(string code) => code?.ToUpperInvariant() switch
    {
        "KUL" => MalaysianState.KualaLumpur,
        "SGR" => MalaysianState.Selangor,
        "JHR" => MalaysianState.Johor,
        "PNG" => MalaysianState.Penang,
        "PRK" => MalaysianState.Perak,
        "PHG" => MalaysianState.Pahang,
        "TRG" => MalaysianState.Terengganu,
        "KTN" => MalaysianState.Kelantan,
        "PLS" => MalaysianState.Perlis,
        "KDH" => MalaysianState.Kedah,
        "MLK" => MalaysianState.Melaka,
        "NSN" => MalaysianState.NegeriSembilan,
        "SWK" => MalaysianState.Sarawak,
        "SBH" => MalaysianState.Sabah,
        _ => throw new ArgumentException($"Unknown Malaysian state code: {code}", nameof(code))
    };
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Models/MalaysianState.cs', malaysianState);

    // Supported Language enum
    const supportedLanguage = `namespace MediMate.Malaysia.SDK.Models;

/// <summary>
/// Supported languages for Malaysian healthcare translation
/// </summary>
public enum SupportedLanguage
{
    /// <summary>Bahasa Malaysia (ms)</summary>
    Malay,
    
    /// <summary>English (en)</summary>
    English,
    
    /// <summary>Chinese (zh)</summary>
    Chinese,
    
    /// <summary>Tamil (ta)</summary>
    Tamil
}

/// <summary>
/// Extension methods for SupportedLanguage enum
/// </summary>
public static class SupportedLanguageExtensions
{
    /// <summary>
    /// Get the language code
    /// </summary>
    public static string GetCode(this SupportedLanguage language) => language switch
    {
        SupportedLanguage.Malay => "ms",
        SupportedLanguage.English => "en",
        SupportedLanguage.Chinese => "zh",
        SupportedLanguage.Tamil => "ta",
        _ => throw new ArgumentOutOfRangeException(nameof(language), language, null)
    };

    /// <summary>
    /// Get the language name
    /// </summary>
    public static string GetName(this SupportedLanguage language) => language switch
    {
        SupportedLanguage.Malay => "Bahasa Malaysia",
        SupportedLanguage.English => "English",
        SupportedLanguage.Chinese => "Chinese",
        SupportedLanguage.Tamil => "Tamil",
        _ => throw new ArgumentOutOfRangeException(nameof(language), language, null)
    };

    /// <summary>
    /// Parse language from code
    /// </summary>
    public static SupportedLanguage FromCode(string code) => code?.ToLowerInvariant() switch
    {
        "ms" => SupportedLanguage.Malay,
        "en" => SupportedLanguage.English,
        "zh" => SupportedLanguage.Chinese,
        "ta" => SupportedLanguage.Tamil,
        _ => throw new ArgumentException($"Unsupported language code: {code}", nameof(code))
    };
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Models/SupportedLanguage.cs', supportedLanguage);

    // API Response models
    const apiResponse = `using System.Text.Json.Serialization;

namespace MediMate.Malaysia.SDK.Models;

/// <summary>
/// Standard API response wrapper
/// </summary>
/// <typeparam name="T">Data type</typeparam>
public class ApiResponse<T>
{
    /// <summary>
    /// Indicates if the request was successful
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Response data
    /// </summary>
    public T? Data { get; set; }

    /// <summary>
    /// Error information (if any)
    /// </summary>
    public ApiError? Error { get; set; }

    /// <summary>
    /// Response metadata
    /// </summary>
    public Dictionary<string, object>? Meta { get; set; }

    /// <summary>
    /// Request ID for tracking
    /// </summary>
    [JsonPropertyName("request_id")]
    public string? RequestId { get; set; }
}

/// <summary>
/// API error information
/// </summary>
public class ApiError
{
    /// <summary>
    /// Error code
    /// </summary>
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Error message
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Detailed error information
    /// </summary>
    public List<object>? Details { get; set; }

    /// <summary>
    /// Multi-language error messages
    /// </summary>
    [JsonPropertyName("cultural_message")]
    public Dictionary<string, string>? CulturalMessage { get; set; }
}

/// <summary>
/// System health status
/// </summary>
public class HealthStatus
{
    /// <summary>
    /// Overall system status
    /// </summary>
    public string Status { get; set; } = string.Empty;

    /// <summary>
    /// Status timestamp
    /// </summary>
    public DateTime Timestamp { get; set; }

    /// <summary>
    /// Service status information
    /// </summary>
    public Dictionary<string, string> Services { get; set; } = new();

    /// <summary>
    /// Cultural context
    /// </summary>
    [JsonPropertyName("cultural_context")]
    public string? CulturalContext { get; set; }

    /// <summary>
    /// Supported languages
    /// </summary>
    [JsonPropertyName("supported_languages")]
    public List<string> SupportedLanguages { get; set; } = new();
}

/// <summary>
/// Malaysian healthcare context
/// </summary>
public class MalaysianContext
{
    /// <summary>
    /// API version
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// Supported features
    /// </summary>
    public List<string> Features { get; set; } = new();

    /// <summary>
    /// Cultural intelligence support
    /// </summary>
    [JsonPropertyName("cultural_intelligence")]
    public bool CulturalIntelligence { get; set; }

    /// <summary>
    /// PDPA compliance
    /// </summary>
    [JsonPropertyName("pdpa_compliance")]
    public bool PdpaCompliance { get; set; }

    /// <summary>
    /// Multi-cultural support
    /// </summary>
    [JsonPropertyName("multi_cultural_support")]
    public bool MultiCulturalSupport { get; set; }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Models/ApiResponse.cs', apiResponse);

    // Prayer Times models
    const prayerModels = `using System.Text.Json.Serialization;

namespace MediMate.Malaysia.SDK.Models;

/// <summary>
/// Prayer times for a Malaysian state
/// </summary>
public class PrayerTimesResponse
{
    /// <summary>
    /// Malaysian state code
    /// </summary>
    [JsonPropertyName("state_code")]
    public string StateCode { get; set; } = string.Empty;

    /// <summary>
    /// State name
    /// </summary>
    [JsonPropertyName("state_name")]
    public string StateName { get; set; } = string.Empty;

    /// <summary>
    /// Date for prayer times
    /// </summary>
    public DateOnly Date { get; set; }

    /// <summary>
    /// Prayer times in 24-hour format
    /// </summary>
    [JsonPropertyName("prayer_times")]
    public Dictionary<string, string> PrayerTimes { get; set; } = new();

    /// <summary>
    /// Healthcare scheduling considerations
    /// </summary>
    [JsonPropertyName("healthcare_considerations")]
    public Dictionary<string, object>? HealthcareConsiderations { get; set; }
}

/// <summary>
/// Current prayer status
/// </summary>
public class CurrentPrayerStatus
{
    /// <summary>
    /// Current time
    /// </summary>
    [JsonPropertyName("current_time")]
    public DateTime CurrentTime { get; set; }

    /// <summary>
    /// Current prayer name
    /// </summary>
    [JsonPropertyName("current_prayer")]
    public string CurrentPrayer { get; set; } = string.Empty;

    /// <summary>
    /// Next prayer information
    /// </summary>
    [JsonPropertyName("next_prayer")]
    public Dictionary<string, object> NextPrayer { get; set; } = new();

    /// <summary>
    /// Whether it's currently prayer time
    /// </summary>
    [JsonPropertyName("is_prayer_time")]
    public bool IsPrayerTime { get; set; }

    /// <summary>
    /// Healthcare scheduling status
    /// </summary>
    [JsonPropertyName("healthcare_scheduling_status")]
    public string HealthcareSchedulingStatus { get; set; } = string.Empty;
}

/// <summary>
/// Translation request
/// </summary>
public class TranslationRequest
{
    /// <summary>
    /// Text to translate
    /// </summary>
    public string Text { get; set; } = string.Empty;

    /// <summary>
    /// Target language code
    /// </summary>
    [JsonPropertyName("target_language")]
    public string TargetLanguage { get; set; } = string.Empty;

    /// <summary>
    /// Source language code (optional)
    /// </summary>
    [JsonPropertyName("source_language")]
    public string? SourceLanguage { get; set; }

    /// <summary>
    /// Translation context
    /// </summary>
    public Dictionary<string, object>? Context { get; set; }
}

/// <summary>
/// Translation response
/// </summary>
public class TranslationResponse
{
    /// <summary>
    /// Original text
    /// </summary>
    [JsonPropertyName("original_text")]
    public string OriginalText { get; set; } = string.Empty;

    /// <summary>
    /// Translated text
    /// </summary>
    [JsonPropertyName("translated_text")]
    public string TranslatedText { get; set; } = string.Empty;

    /// <summary>
    /// Source language
    /// </summary>
    [JsonPropertyName("source_language")]
    public string SourceLanguage { get; set; } = string.Empty;

    /// <summary>
    /// Target language
    /// </summary>
    [JsonPropertyName("target_language")]
    public string TargetLanguage { get; set; } = string.Empty;

    /// <summary>
    /// Translation confidence score
    /// </summary>
    [JsonPropertyName("confidence_score")]
    public double ConfidenceScore { get; set; }

    /// <summary>
    /// Cultural notes
    /// </summary>
    [JsonPropertyName("cultural_notes")]
    public List<string>? CulturalNotes { get; set; }

    /// <summary>
    /// Whether medical accuracy was validated
    /// </summary>
    [JsonPropertyName("medical_accuracy_validated")]
    public bool MedicalAccuracyValidated { get; set; }
}

/// <summary>
/// Halal medication validation request
/// </summary>
public class HalalValidationRequest
{
    /// <summary>
    /// Medication name
    /// </summary>
    [JsonPropertyName("medication_name")]
    public string MedicationName { get; set; } = string.Empty;

    /// <summary>
    /// Manufacturer name (optional)
    /// </summary>
    public string? Manufacturer { get; set; }

    /// <summary>
    /// Active ingredients (optional)
    /// </summary>
    [JsonPropertyName("active_ingredients")]
    public List<string>? ActiveIngredients { get; set; }

    /// <summary>
    /// Batch number (optional)
    /// </summary>
    [JsonPropertyName("batch_number")]
    public string? BatchNumber { get; set; }

    /// <summary>
    /// Expiry date (optional)
    /// </summary>
    [JsonPropertyName("expiry_date")]
    public DateOnly? ExpiryDate { get; set; }
}

/// <summary>
/// Halal medication validation response
/// </summary>
public class HalalValidationResponse
{
    /// <summary>
    /// Medication name
    /// </summary>
    [JsonPropertyName("medication_name")]
    public string MedicationName { get; set; } = string.Empty;

    /// <summary>
    /// Halal status
    /// </summary>
    [JsonPropertyName("halal_status")]
    public string HalalStatus { get; set; } = string.Empty;

    /// <summary>
    /// Validation confidence level
    /// </summary>
    public string Confidence { get; set; } = string.Empty;

    /// <summary>
    /// Certification information
    /// </summary>
    public HalalCertification? Certification { get; set; }

    /// <summary>
    /// Ingredient analysis
    /// </summary>
    [JsonPropertyName("ingredients_analysis")]
    public List<Dictionary<string, object>>? IngredientsAnalysis { get; set; }

    /// <summary>
    /// Alternative medications
    /// </summary>
    public List<Dictionary<string, object>>? Alternatives { get; set; }
}

/// <summary>
/// Halal certification details
/// </summary>
public class HalalCertification
{
    /// <summary>
    /// Whether certified
    /// </summary>
    public bool Certified { get; set; }

    /// <summary>
    /// Certifying authority
    /// </summary>
    public string? Authority { get; set; }

    /// <summary>
    /// Certificate number
    /// </summary>
    [JsonPropertyName("certificate_number")]
    public string? CertificateNumber { get; set; }

    /// <summary>
    /// Expiry date
    /// </summary>
    [JsonPropertyName("expiry_date")]
    public DateOnly? ExpiryDate { get; set; }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Models/Cultural.cs', prayerModels);
  }

  generateConfiguration() {
    const config = `using MediMate.Malaysia.SDK.Models;

namespace MediMate.Malaysia.SDK.Configuration;

/// <summary>
/// Configuration for MediMate Malaysia SDK
/// </summary>
public class MediMateConfig
{
    /// <summary>
    /// API key (required)
    /// </summary>
    public string ApiKey { get; set; } = string.Empty;

    /// <summary>
    /// Base URL for the API
    /// </summary>
    public string BaseUrl { get; set; } = "https://api.medimate.my/v1";

    /// <summary>
    /// HTTP timeout in seconds
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Enable debug logging
    /// </summary>
    public bool Debug { get; set; } = false;

    /// <summary>
    /// Malaysian state for cultural context
    /// </summary>
    public MalaysianState? MalaysianState { get; set; }

    /// <summary>
    /// Preferred language for responses
    /// </summary>
    public SupportedLanguage? PreferredLanguage { get; set; }

    /// <summary>
    /// Enable prayer time awareness
    /// </summary>
    public bool PrayerTimeAware { get; set; } = true;

    /// <summary>
    /// Require halal compliance
    /// </summary>
    public bool HalalRequirements { get; set; } = false;

    /// <summary>
    /// Enable Ramadan adjustments
    /// </summary>
    public bool RamadanAdjustments { get; set; } = false;

    /// <summary>
    /// Validate the configuration
    /// </summary>
    /// <exception cref="ArgumentException">When configuration is invalid</exception>
    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(ApiKey))
        {
            throw new ArgumentException("API key is required", nameof(ApiKey));
        }

        if (TimeoutSeconds <= 0)
        {
            throw new ArgumentException("Timeout must be greater than 0", nameof(TimeoutSeconds));
        }

        if (string.IsNullOrWhiteSpace(BaseUrl))
        {
            throw new ArgumentException("Base URL is required", nameof(BaseUrl));
        }

        if (!Uri.TryCreate(BaseUrl, UriKind.Absolute, out _))
        {
            throw new ArgumentException("Base URL must be a valid absolute URI", nameof(BaseUrl));
        }
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Configuration/MediMateConfig.cs', config);
  }

  generateCulturalService() {
    const culturalService = `using Microsoft.Extensions.Logging;
using MediMate.Malaysia.SDK.Client;
using MediMate.Malaysia.SDK.Models;

namespace MediMate.Malaysia.SDK.Services;

/// <summary>
/// Cultural Intelligence Service for Malaysian Healthcare
/// </summary>
public interface ICulturalService
{
    /// <summary>
    /// Get prayer times for a Malaysian state
    /// </summary>
    Task<PrayerTimesResponse> GetPrayerTimesAsync(MalaysianState state, DateOnly? date = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get current prayer status
    /// </summary>
    Task<CurrentPrayerStatus> GetCurrentPrayerStatusAsync(MalaysianState state, CancellationToken cancellationToken = default);

    /// <summary>
    /// Translate healthcare text
    /// </summary>
    Task<TranslationResponse> TranslateAsync(string text, SupportedLanguage targetLanguage, SupportedLanguage? sourceLanguage = null, Dictionary<string, object>? context = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate medication for halal compliance
    /// </summary>
    Task<HalalValidationResponse> ValidateMedicationAsync(string medicationName, string? manufacturer = null, List<string>? activeIngredients = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get Ramadan information
    /// </summary>
    Task<Dictionary<string, object>> GetRamadanInfoAsync(int year, CancellationToken cancellationToken = default);
}

/// <summary>
/// Cultural Intelligence Service implementation
/// </summary>
internal class CulturalService : ICulturalService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<CulturalService>? _logger;

    public CulturalService(MediMateMalaysiaClient client, ILogger<CulturalService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<PrayerTimesResponse> GetPrayerTimesAsync(
        MalaysianState state, 
        DateOnly? date = null, 
        CancellationToken cancellationToken = default)
    {
        var endpoint = $"/cultural/prayer-times/{state.GetCode()}";
        
        if (date.HasValue)
        {
            endpoint += $"?date={date.Value:yyyy-MM-dd}";
        }

        var response = await _client.GetAsync<PrayerTimesResponse>(endpoint, cancellationToken);
        
        return response.Data ?? throw new InvalidOperationException("No prayer times data received");
    }

    public async Task<CurrentPrayerStatus> GetCurrentPrayerStatusAsync(
        MalaysianState state, 
        CancellationToken cancellationToken = default)
    {
        var endpoint = $"/cultural/prayer-times/{state.GetCode()}/current";
        var response = await _client.GetAsync<CurrentPrayerStatus>(endpoint, cancellationToken);
        
        return response.Data ?? throw new InvalidOperationException("No prayer status data received");
    }

    public async Task<TranslationResponse> TranslateAsync(
        string text, 
        SupportedLanguage targetLanguage,
        SupportedLanguage? sourceLanguage = null, 
        Dictionary<string, object>? context = null,
        CancellationToken cancellationToken = default)
    {
        var request = new TranslationRequest
        {
            Text = text,
            TargetLanguage = targetLanguage.GetCode(),
            SourceLanguage = sourceLanguage?.GetCode(),
            Context = context
        };

        var response = await _client.PostAsync<TranslationResponse>("/cultural/translate", request, cancellationToken);
        
        return response.Data ?? throw new InvalidOperationException("No translation data received");
    }

    public async Task<HalalValidationResponse> ValidateMedicationAsync(
        string medicationName, 
        string? manufacturer = null, 
        List<string>? activeIngredients = null,
        CancellationToken cancellationToken = default)
    {
        var request = new HalalValidationRequest
        {
            MedicationName = medicationName,
            Manufacturer = manufacturer,
            ActiveIngredients = activeIngredients
        };

        var response = await _client.PostAsync<HalalValidationResponse>(
            "/cultural/halal/validate-medication", request, cancellationToken);
        
        return response.Data ?? throw new InvalidOperationException("No halal validation data received");
    }

    public async Task<Dictionary<string, object>> GetRamadanInfoAsync(
        int year, 
        CancellationToken cancellationToken = default)
    {
        var endpoint = $"/cultural/calendar/ramadan/{year}";
        var response = await _client.GetAsync<Dictionary<string, object>>(endpoint, cancellationToken);
        
        return response.Data ?? throw new InvalidOperationException("No Ramadan data received");
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Services/CulturalService.cs', culturalService);
  }

  generatePatientService() {
    const patientService = `using Microsoft.Extensions.Logging;
using MediMate.Malaysia.SDK.Client;

namespace MediMate.Malaysia.SDK.Services;

/// <summary>
/// Patient Management Service with PDPA compliance
/// </summary>
public interface IPatientService
{
    /// <summary>
    /// Create new patient
    /// </summary>
    Task<Dictionary<string, object>> CreatePatientAsync(object patientData, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get patient by ID
    /// </summary>
    Task<Dictionary<string, object>> GetPatientAsync(string patientId, CancellationToken cancellationToken = default);

    /// <summary>
    /// List patients with pagination
    /// </summary>
    Task<Dictionary<string, object>> ListPatientsAsync(int page = 1, int limit = 20, string? search = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Patient Management Service implementation
/// </summary>
internal class PatientService : IPatientService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<PatientService>? _logger;

    public PatientService(MediMateMalaysiaClient client, ILogger<PatientService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>> CreatePatientAsync(
        object patientData, 
        CancellationToken cancellationToken = default)
    {
        var response = await _client.PostAsync<Dictionary<string, object>>("/patients", patientData, cancellationToken);
        return response.Data ?? throw new InvalidOperationException("No patient data received");
    }

    public async Task<Dictionary<string, object>> GetPatientAsync(
        string patientId, 
        CancellationToken cancellationToken = default)
    {
        var response = await _client.GetAsync<Dictionary<string, object>>($"/patients/{patientId}", cancellationToken);
        return response.Data ?? throw new InvalidOperationException("No patient data received");
    }

    public async Task<Dictionary<string, object>> ListPatientsAsync(
        int page = 1, 
        int limit = 20, 
        string? search = null, 
        CancellationToken cancellationToken = default)
    {
        var endpoint = $"/patients?page={page}&limit={limit}";
        
        if (!string.IsNullOrWhiteSpace(search))
        {
            endpoint += $"&search={Uri.EscapeDataString(search)}";
        }

        var response = await _client.GetAsync<Dictionary<string, object>>(endpoint, cancellationToken);
        return response.Data ?? throw new InvalidOperationException("No patients data received");
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Services/PatientService.cs', patientService);

    // Generate placeholder service interfaces
    const placeholderServices = `using Microsoft.Extensions.Logging;
using MediMate.Malaysia.SDK.Client;

namespace MediMate.Malaysia.SDK.Services;

// Placeholder service interfaces

public interface IAppointmentService
{
    Task<Dictionary<string, object>> CreateAppointmentAsync(object appointmentData, CancellationToken cancellationToken = default);
    Task<Dictionary<string, object>> GetAppointmentAsync(string appointmentId, CancellationToken cancellationToken = default);
}

public interface IMedicationService
{
    Task<Dictionary<string, object>> SearchMedicationsAsync(string query, bool halalOnly = false, CancellationToken cancellationToken = default);
}

public interface IRealtimeService
{
    Task<Dictionary<string, object>> SubscribeToNotificationsAsync(object subscriptionData, CancellationToken cancellationToken = default);
}

public interface IFhirService
{
    Task<Dictionary<string, object>> SearchPatientsAsync(string? identifier = null, string? name = null, CancellationToken cancellationToken = default);
}

// Placeholder implementations

internal class AppointmentService : IAppointmentService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<AppointmentService>? _logger;

    public AppointmentService(MediMateMalaysiaClient client, ILogger<AppointmentService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>> CreateAppointmentAsync(object appointmentData, CancellationToken cancellationToken = default)
    {
        var response = await _client.PostAsync<Dictionary<string, object>>("/appointments", appointmentData, cancellationToken);
        return response.Data ?? new Dictionary<string, object>();
    }

    public async Task<Dictionary<string, object>> GetAppointmentAsync(string appointmentId, CancellationToken cancellationToken = default)
    {
        var response = await _client.GetAsync<Dictionary<string, object>>($"/appointments/{appointmentId}", cancellationToken);
        return response.Data ?? new Dictionary<string, object>();
    }
}

internal class MedicationService : IMedicationService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<MedicationService>? _logger;

    public MedicationService(MediMateMalaysiaClient client, ILogger<MedicationService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>> SearchMedicationsAsync(string query, bool halalOnly = false, CancellationToken cancellationToken = default)
    {
        var endpoint = $"/medications?search={Uri.EscapeDataString(query)}&halal_only={halalOnly}";
        var response = await _client.GetAsync<Dictionary<string, object>>(endpoint, cancellationToken);
        return response.Data ?? new Dictionary<string, object>();
    }
}

internal class RealtimeService : IRealtimeService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<RealtimeService>? _logger;

    public RealtimeService(MediMateMalaysiaClient client, ILogger<RealtimeService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>> SubscribeToNotificationsAsync(object subscriptionData, CancellationToken cancellationToken = default)
    {
        var response = await _client.PostAsync<Dictionary<string, object>>("/realtime/notifications/subscribe", subscriptionData, cancellationToken);
        return response.Data ?? new Dictionary<string, object>();
    }
}

internal class FhirService : IFhirService
{
    private readonly MediMateMalaysiaClient _client;
    private readonly ILogger<FhirService>? _logger;

    public FhirService(MediMateMalaysiaClient client, ILogger<FhirService>? logger = null)
    {
        _client = client;
        _logger = logger;
    }

    public async Task<Dictionary<string, object>> SearchPatientsAsync(string? identifier = null, string? name = null, CancellationToken cancellationToken = default)
    {
        var endpoint = "/fhir/Patient";
        var queryParams = new List<string>();
        
        if (!string.IsNullOrWhiteSpace(identifier))
            queryParams.Add($"identifier={Uri.EscapeDataString(identifier)}");
            
        if (!string.IsNullOrWhiteSpace(name))
            queryParams.Add($"name={Uri.EscapeDataString(name)}");

        if (queryParams.Any())
            endpoint += "?" + string.Join("&", queryParams);

        var response = await _client.GetAsync<Dictionary<string, object>>(endpoint, cancellationToken);
        return response.Data ?? new Dictionary<string, object>();
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Services/PlaceholderServices.cs', placeholderServices);
  }

  generateExceptions() {
    const exceptions = `namespace MediMate.Malaysia.SDK.Exceptions;

/// <summary>
/// Base exception for MediMate SDK
/// </summary>
public class MediMateException : Exception
{
    /// <summary>
    /// Error code
    /// </summary>
    public string ErrorCode { get; }

    /// <summary>
    /// Multi-language error messages
    /// </summary>
    public Dictionary<string, string>? CulturalMessage { get; }

    /// <summary>
    /// Additional error details
    /// </summary>
    public object? Details { get; }

    public MediMateException(string message, string errorCode = "UNKNOWN_ERROR") 
        : base(message)
    {
        ErrorCode = errorCode;
    }

    public MediMateException(string message, string errorCode, Exception innerException) 
        : base(message, innerException)
    {
        ErrorCode = errorCode;
    }

    public MediMateException(
        string message, 
        string errorCode, 
        Dictionary<string, string>? culturalMessage = null, 
        object? details = null) 
        : base(message)
    {
        ErrorCode = errorCode;
        CulturalMessage = culturalMessage;
        Details = details;
    }

    /// <summary>
    /// Get message in specified language
    /// </summary>
    /// <param name="languageCode">Language code (ms, en, zh, ta)</param>
    /// <returns>Localized message or default message</returns>
    public string GetMessage(string languageCode)
    {
        if (CulturalMessage?.TryGetValue(languageCode, out var localizedMessage) == true)
        {
            return localizedMessage;
        }
        return Message;
    }
}

/// <summary>
/// Authentication error
/// </summary>
public class MediMateAuthenticationException : MediMateException
{
    public MediMateAuthenticationException(string message = "Authentication failed") 
        : base(message, "AUTHENTICATION_ERROR")
    {
    }
}

/// <summary>
/// Rate limiting error
/// </summary>
public class MediMateRateLimitException : MediMateException
{
    /// <summary>
    /// Retry after seconds
    /// </summary>
    public int RetryAfterSeconds { get; }

    public MediMateRateLimitException(string message, int retryAfterSeconds) 
        : base(message, "RATE_LIMIT_ERROR")
    {
        RetryAfterSeconds = retryAfterSeconds;
    }
}

/// <summary>
/// HTTP error
/// </summary>
public class MediMateHttpException : MediMateException
{
    /// <summary>
    /// HTTP status code
    /// </summary>
    public System.Net.HttpStatusCode StatusCode { get; }

    public MediMateHttpException(string message, System.Net.HttpStatusCode statusCode) 
        : base(message, "HTTP_ERROR")
    {
        StatusCode = statusCode;
    }
}

/// <summary>
/// Validation error
/// </summary>
public class MediMateValidationException : MediMateException
{
    public MediMateValidationException(string message, object? details = null) 
        : base(message, "VALIDATION_ERROR", details: details)
    {
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Exceptions/MediMateException.cs', exceptions);
  }

  generateUtils() {
    const utils = `namespace MediMate.Malaysia.SDK.Utils;

/// <summary>
/// API key validation utilities
/// </summary>
public static class ApiKeyValidator
{
    /// <summary>
    /// Validate API key format
    /// </summary>
    /// <param name="apiKey">API key to validate</param>
    /// <returns>True if valid format</returns>
    public static bool IsValid(string? apiKey)
    {
        return !string.IsNullOrWhiteSpace(apiKey) && 
               apiKey.StartsWith("mk_") && 
               apiKey.Length > 12;
    }

    /// <summary>
    /// Check if API key is for testing
    /// </summary>
    /// <param name="apiKey">API key to check</param>
    /// <returns>True if test key</returns>
    public static bool IsTestKey(string? apiKey)
    {
        return apiKey?.StartsWith("mk_test_") == true;
    }

    /// <summary>
    /// Check if API key is for production
    /// </summary>
    /// <param name="apiKey">API key to check</param>
    /// <returns>True if live key</returns>
    public static bool IsLiveKey(string? apiKey)
    {
        return apiKey?.StartsWith("mk_live_") == true;
    }
}`;

    this.writeFile('src/MediMate.Malaysia.SDK/Utils/ApiKeyValidator.cs', utils);
  }

  generateExamples() {
    const example = `using MediMate.Malaysia.SDK.Client;
using MediMate.Malaysia.SDK.Configuration;
using MediMate.Malaysia.SDK.Models;

namespace MediMate.Malaysia.SDK.Examples;

/// <summary>
/// Basic usage examples for MediMate Malaysia SDK
/// </summary>
public class BasicUsageExample
{
    public static async Task Main(string[] args)
    {
        // Configure with Malaysian cultural context
        var config = new MediMateConfig
        {
            ApiKey = "mk_test_your_api_key_here", // Replace with your actual API key
            MalaysianState = Models.MalaysianState.KualaLumpur,
            PreferredLanguage = SupportedLanguage.Malay,
            PrayerTimeAware = true,
            HalalRequirements = true,
            Debug = true
        };

        // Validate configuration
        config.Validate();

        using var client = new MediMateMalaysiaClient(config);

        try
        {
            // Example 1: Get prayer times for Kuala Lumpur
            Console.WriteLine("=== Prayer Times Example ===");
            var prayerTimes = await client.Cultural.GetPrayerTimesAsync(Models.MalaysianState.KualaLumpur);
            
            Console.WriteLine($"State: {prayerTimes.StateName}");
            Console.WriteLine($"Date: {prayerTimes.Date}");
            Console.WriteLine($"Maghrib: {prayerTimes.PrayerTimes.GetValueOrDefault("maghrib")}");

            // Example 2: Validate halal medication
            Console.WriteLine("\\n=== Halal Validation Example ===");
            var halalResult = await client.Cultural.ValidateMedicationAsync(
                "Paracetamol 500mg", 
                "Duopharma Biotech");
            
            Console.WriteLine($"Medication: {halalResult.MedicationName}");
            Console.WriteLine($"Halal Status: {halalResult.HalalStatus}");

            // Example 3: Translate healthcare text
            Console.WriteLine("\\n=== Translation Example ===");
            var translation = await client.Cultural.TranslateAsync(
                "Take this medication twice daily after meals", 
                SupportedLanguage.Malay);
            
            Console.WriteLine($"Original: {translation.OriginalText}");
            Console.WriteLine($"Translation: {translation.TranslatedText}");
            Console.WriteLine($"Confidence: {translation.ConfidenceScore:P1}");

            // Example 4: Get API health status
            Console.WriteLine("\\n=== Health Check Example ===");
            var health = await client.GetHealthAsync();
            Console.WriteLine($"API Status: {health.Data?.Status}");

            // Example 5: Get current prayer status
            Console.WriteLine("\\n=== Current Prayer Status Example ===");
            var currentPrayer = await client.Cultural.GetCurrentPrayerStatusAsync(Models.MalaysianState.KualaLumpur);
            Console.WriteLine($"Current Prayer: {currentPrayer.CurrentPrayer}");
            Console.WriteLine($"Scheduling Status: {currentPrayer.HealthcareSchedulingStatus}");

        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
            
            if (ex is MediMate.Malaysia.SDK.Exceptions.MediMateException mediMateEx)
            {
                Console.WriteLine($"Error Code: {mediMateEx.ErrorCode}");
                
                // Display cultural message if available
                var malayMessage = mediMateEx.GetMessage("ms");
                if (malayMessage != mediMateEx.Message)
                {
                    Console.WriteLine($"Malay: {malayMessage}");
                }
            }
        }

        Console.WriteLine("\\nPress any key to exit...");
        Console.ReadKey();
    }
}`;

    this.writeFile('examples/BasicUsageExample.cs', example);
  }

  generateTests() {
    const testProject = `<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>${SDK_CONFIG.targetFramework}</TargetFramework>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.6.0" />
    <PackageReference Include="xunit" Version="2.4.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.4.5" />
    <PackageReference Include="Moq" Version="4.20.69" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" Version="7.0.9" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\\..\\src\\MediMate.Malaysia.SDK\\MediMate.Malaysia.SDK.csproj" />
  </ItemGroup>

</Project>`;

    this.writeFile('tests/MediMate.Malaysia.SDK.Tests/MediMate.Malaysia.SDK.Tests.csproj', testProject);

    const test = `using Xunit;
using MediMate.Malaysia.SDK.Client;
using MediMate.Malaysia.SDK.Configuration;
using MediMate.Malaysia.SDK.Models;
using MediMate.Malaysia.SDK.Exceptions;

namespace MediMate.Malaysia.SDK.Tests;

public class MediMateMalaysiaClientTests
{
    [Fact]
    public void Constructor_WithValidConfig_ShouldInitializeServices()
    {
        // Arrange
        var config = new MediMateConfig
        {
            ApiKey = "mk_test_valid_key_for_testing",
            MalaysianState = Models.MalaysianState.KualaLumpur,
            PreferredLanguage = SupportedLanguage.Malay
        };

        // Act
        using var client = new MediMateMalaysiaClient(config);

        // Assert
        Assert.NotNull(client.Cultural);
        Assert.NotNull(client.Patients);
        Assert.NotNull(client.Appointments);
        Assert.NotNull(client.Medications);
        Assert.NotNull(client.Realtime);
        Assert.NotNull(client.Fhir);
    }

    [Fact]
    public void Constructor_WithInvalidApiKey_ShouldThrowException()
    {
        // Arrange
        var config = new MediMateConfig
        {
            ApiKey = "invalid_key"
        };

        // Act & Assert
        Assert.Throws<MediMateException>(() => new MediMateMalaysiaClient(config));
    }

    [Fact]
    public void Constructor_WithNullConfig_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new MediMateMalaysiaClient(null!));
    }

    [Theory]
    [InlineData("mk_test_valid_key")]
    [InlineData("mk_live_production_key")]
    public void Constructor_WithValidApiKeyFormats_ShouldSucceed(string apiKey)
    {
        // Arrange
        var config = new MediMateConfig { ApiKey = apiKey };

        // Act & Assert (should not throw)
        using var client = new MediMateMalaysiaClient(config);
        Assert.NotNull(client);
    }
}

public class MalaysianStateExtensionsTests
{
    [Theory]
    [InlineData(Models.MalaysianState.KualaLumpur, "KUL")]
    [InlineData(Models.MalaysianState.Selangor, "SGR")]
    [InlineData(Models.MalaysianState.Johor, "JHR")]
    public void GetCode_ShouldReturnCorrectCode(Models.MalaysianState state, string expectedCode)
    {
        // Act
        var code = state.GetCode();

        // Assert
        Assert.Equal(expectedCode, code);
    }

    [Theory]
    [InlineData("KUL", Models.MalaysianState.KualaLumpur)]
    [InlineData("SGR", Models.MalaysianState.Selangor)]
    [InlineData("JHR", Models.MalaysianState.Johor)]
    public void FromCode_WithValidCode_ShouldReturnCorrectState(string code, Models.MalaysianState expectedState)
    {
        // Act
        var state = MalaysianStateExtensions.FromCode(code);

        // Assert
        Assert.Equal(expectedState, state);
    }

    [Fact]
    public void FromCode_WithInvalidCode_ShouldThrowArgumentException()
    {
        // Act & Assert
        Assert.Throws<ArgumentException>(() => MalaysianStateExtensions.FromCode("INVALID"));
    }
}`;

    this.writeFile('tests/MediMate.Malaysia.SDK.Tests/ClientTests.cs', test);
  }

  generateReadme() {
    const readme = `# MediMate Malaysia Healthcare API - .NET SDK

Official .NET SDK for MediMate Malaysia Healthcare API with comprehensive Malaysian cultural intelligence features.

## 🇲🇾 Malaysian Healthcare Features

- **Prayer Time Integration**: Real-time prayer times for all 13 Malaysian states
- **Halal Medication Validation**: JAKIM-certified halal medication checking
- **Multi-Language Support**: Bahasa Malaysia, English, Chinese, Tamil
- **PDPA 2010 Compliance**: Built-in Malaysian data protection compliance
- **Cultural Calendar**: Ramadan, Eid, and Malaysian cultural event integration
- **Real-time Notifications**: SignalR support with cultural context

## Installation

### Package Manager Console

\`\`\`powershell
Install-Package ${SDK_CONFIG.packageId}
\`\`\`

### .NET CLI

\`\`\`bash
dotnet add package ${SDK_CONFIG.packageId}
\`\`\`

### PackageReference

\`\`\`xml
<PackageReference Include="${SDK_CONFIG.packageId}" Version="${SDK_CONFIG.version}" />
\`\`\`

## Quick Start

\`\`\`csharp
using MediMate.Malaysia.SDK.Client;
using MediMate.Malaysia.SDK.Configuration;
using MediMate.Malaysia.SDK.Models;

// Configure with Malaysian cultural context
var config = new MediMateConfig
{
    ApiKey = "mk_live_your_key_here",
    MalaysianState = MalaysianState.KualaLumpur,
    PreferredLanguage = SupportedLanguage.Malay,
    PrayerTimeAware = true,
    HalalRequirements = true
};

using var client = new MediMateMalaysiaClient(config);

// Get prayer times for Kuala Lumpur
var prayerTimes = await client.Cultural.GetPrayerTimesAsync(MalaysianState.KualaLumpur);
Console.WriteLine($"Maghrib: {prayerTimes.PrayerTimes["maghrib"]}");

// Validate halal medication
var halalResult = await client.Cultural.ValidateMedicationAsync(
    "Paracetamol 500mg", 
    "Duopharma Biotech");
Console.WriteLine($"Halal Status: {halalResult.HalalStatus}");

// Translate healthcare text
var translation = await client.Cultural.TranslateAsync(
    "Take this medication twice daily after meals", 
    SupportedLanguage.Malay);
Console.WriteLine($"Translation: {translation.TranslatedText}");
\`\`\`

## Configuration

\`\`\`csharp
var config = new MediMateConfig
{
    ApiKey = "your_api_key",                              // Required
    BaseUrl = "https://api.medimate.my/v1",              // Optional (default)
    TimeoutSeconds = 30,                                  // Optional (default: 30)
    Debug = true,                                         // Enable debug logging
    MalaysianState = MalaysianState.KualaLumpur,         // Cultural context
    PreferredLanguage = SupportedLanguage.Malay,         // Language preference  
    PrayerTimeAware = true,                              // Prayer time integration
    HalalRequirements = true,                            // Halal medication filtering
    RamadanAdjustments = true                            // Ramadan scheduling
};

// Validate configuration
config.Validate();
\`\`\`

## Malaysian States

\`\`\`csharp
// All Malaysian states are supported
MalaysianState.KualaLumpur      // KUL
MalaysianState.Selangor         // SGR
MalaysianState.Johor           // JHR
MalaysianState.Penang          // PNG
MalaysianState.Perak           // PRK
MalaysianState.Pahang          // PHG
MalaysianState.Terengganu      // TRG
MalaysianState.Kelantan        // KTN
MalaysianState.Perlis          // PLS
MalaysianState.Kedah           // KDH
MalaysianState.Melaka          // MLK
MalaysianState.NegeriSembilan  // NSN
MalaysianState.Sarawak         // SWK
MalaysianState.Sabah           // SBH

// Get state code and name
var code = MalaysianState.KualaLumpur.GetCode(); // "KUL"
var name = MalaysianState.KualaLumpur.GetName(); // "Kuala Lumpur"

// Parse from code
var state = MalaysianStateExtensions.FromCode("KUL");
\`\`\`

## Services

### Cultural Intelligence Service

\`\`\`csharp
// Prayer times with healthcare scheduling
var prayerTimes = await client.Cultural.GetPrayerTimesAsync(
    MalaysianState.KualaLumpur, 
    DateOnly.FromDateTime(DateTime.Today));

var currentStatus = await client.Cultural.GetCurrentPrayerStatusAsync(
    MalaysianState.KualaLumpur);

// Healthcare translation with cultural context
var translation = await client.Cultural.TranslateAsync(
    "Please fast before the blood test",
    SupportedLanguage.Malay,
    SupportedLanguage.English,
    new Dictionary<string, object>
    {
        ["domain"] = "clinical",
        ["urgency"] = "medium"
    });

// Halal medication validation
var halalCheck = await client.Cultural.ValidateMedicationAsync(
    "Insulin injection",
    "Novo Nordisk",
    new List<string> { "insulin", "glycerin" });

// Ramadan healthcare considerations
var ramadanInfo = await client.Cultural.GetRamadanInfoAsync(2024);
\`\`\`

### Patient Management

\`\`\`csharp
// Create patient with cultural preferences
var patientData = new
{
    personal_info = new
    {
        name = "Ahmad bin Abdullah",
        mykad_number = "800101-01-1234",
        date_of_birth = "1980-01-01",
        gender = "male",
        race = "Malay",
        religion = "Islam"
    },
    cultural_preferences = new
    {
        primary_language = "ms",
        prayer_time_notifications = true,
        halal_medication_only = true
    }
};

var patient = await client.Patients.CreatePatientAsync(patientData);

// Get patient by ID
var patientInfo = await client.Patients.GetPatientAsync("patient-id");

// List patients with search
var patients = await client.Patients.ListPatientsAsync(1, 20, "Ahmad");
\`\`\`

## Dependency Injection (.NET 6+)

\`\`\`csharp
// Program.cs or Startup.cs
services.AddSingleton<MediMateConfig>(provider =>
{
    var config = new MediMateConfig
    {
        ApiKey = builder.Configuration["MediMate:ApiKey"] ?? throw new InvalidOperationException("API key required"),
        MalaysianState = MalaysianState.KualaLumpur,
        PreferredLanguage = SupportedLanguage.Malay,
        PrayerTimeAware = true,
        HalalRequirements = true,
        Debug = builder.Environment.IsDevelopment()
    };
    
    config.Validate();
    return config;
});

services.AddScoped<MediMateMalaysiaClient>();

// In your service or controller
public class HealthcareService
{
    private readonly MediMateMalaysiaClient _mediMateClient;

    public HealthcareService(MediMateMalaysiaClient mediMateClient)
    {
        _mediMateClient = mediMateClient;
    }

    public async Task<PrayerTimesResponse> GetPrayerTimesAsync()
    {
        return await _mediMateClient.Cultural.GetPrayerTimesAsync(
            MalaysianState.KualaLumpur);
    }
}
\`\`\`

## Error Handling

\`\`\`csharp
using MediMate.Malaysia.SDK.Exceptions;

try
{
    var prayerTimes = await client.Cultural.GetPrayerTimesAsync(
        MalaysianState.KualaLumpur);
}
catch (MediMateRateLimitException rateLimitEx)
{
    Console.WriteLine($"Rate limited. Retry after {rateLimitEx.RetryAfterSeconds} seconds");
}
catch (MediMateAuthenticationException authEx)
{
    Console.WriteLine($"Authentication failed: {authEx.Message}");
}
catch (MediMateException mediMateEx)
{
    Console.WriteLine($"API Error: {mediMateEx.ErrorCode} - {mediMateEx.Message}");
    
    // Get localized error message
    var malayMessage = mediMateEx.GetMessage("ms");
    if (malayMessage != mediMateEx.Message)
    {
        Console.WriteLine($"Malay: {malayMessage}");
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Unexpected error: {ex.Message}");
}
\`\`\`

## Async/Await Best Practices

\`\`\`csharp
// ✅ Good - properly awaited
var prayerTimes = await client.Cultural.GetPrayerTimesAsync(MalaysianState.KualaLumpur);

// ✅ Good - with cancellation token
var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var translation = await client.Cultural.TranslateAsync(
    "Emergency", 
    SupportedLanguage.Malay, 
    cancellationToken: cts.Token);

// ✅ Good - concurrent calls
var tasks = new[]
{
    client.Cultural.GetPrayerTimesAsync(MalaysianState.KualaLumpur),
    client.Cultural.GetPrayerTimesAsync(MalaysianState.Selangor),
    client.Cultural.GetPrayerTimesAsync(MalaysianState.Johor)
};

var results = await Task.WhenAll(tasks);
\`\`\`

## Requirements

- .NET 6.0 or later
- C# 10 or later

## License

MIT License - see LICENSE file for details.

## Support

- Documentation: https://docs.medimate.my/dotnet-sdk
- GitHub Issues: https://github.com/medimate-malaysia/dotnet-sdk/issues
- NuGet Package: https://www.nuget.org/packages/${SDK_CONFIG.packageId}/
- Email: sdk@medimate.my

---

🇲🇾 **Designed for Malaysian Healthcare** - Supporting Malaysian cultural and religious requirements in healthcare technology.
`;

    this.writeFile('README.md', readme);
  }

  generateNuGetConfig() {
    const nugetConfig = `<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <packageSources>
    <clear />
    <add key="nuget.org" value="https://api.nuget.org/v3/index.json" protocolVersion="3" />
  </packageSources>
</configuration>`;

    this.writeFile('nuget.config', nugetConfig);
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
  
  const generator = new DotNetSDKGenerator(openApiSpec);
  generator.generate();
}