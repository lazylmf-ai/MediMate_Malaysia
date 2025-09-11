# Getting Started with MediMate Malaysia Healthcare API

## Introduction

Welcome to the MediMate Malaysia Healthcare API! This guide will help you get started with integrating Malaysian healthcare services with cultural intelligence, PDPA compliance, and Islamic healthcare considerations.

## What Makes This API Special for Malaysia?

- **🕌 Prayer Time Integration**: Real-time prayer times for all 13 Malaysian states with healthcare scheduling recommendations
- **✅ Halal Validation**: JAKIM-certified halal medication and treatment validation
- **🌏 Multi-Language Support**: Bahasa Malaysia, English, Chinese, Tamil with medical accuracy
- **🔒 PDPA 2010 Compliance**: Built-in Malaysian data protection compliance
- **📅 Cultural Calendar**: Ramadan, Eid, and Malaysian cultural event integration
- **⚡ Real-time Features**: WebSocket notifications with cultural context

## Prerequisites

- API key from MediMate Malaysia (register at [api.medimate.my](https://api.medimate.my))
- Basic understanding of REST APIs
- Development environment (any language supported)

## Supported SDKs

| Language | Package | Installation |
|----------|---------|--------------|
| JavaScript/TypeScript | `@medimate/malaysia-sdk` | `npm install @medimate/malaysia-sdk` |
| Python | `medimate-malaysia` | `pip install medimate-malaysia` |
| Java | `my.medimate:medimate-malaysia-sdk` | Maven/Gradle dependency |
| .NET | `MediMate.Malaysia.SDK` | `dotnet add package MediMate.Malaysia.SDK` |

## Quick Start Examples

### JavaScript/TypeScript

```javascript
import { MediMateMalaysia } from '@medimate/malaysia-sdk';

const client = new MediMateMalaysia({
  apiKey: 'mk_live_your_key_here',
  culturalContext: {
    malaysianState: 'KUL',
    preferredLanguage: 'ms',
    prayerTimeAware: true,
    halalRequirements: true
  }
});

// Get prayer times for Kuala Lumpur
const prayerTimes = await client.cultural.getPrayerTimes('KUL');
console.log('Maghrib prayer:', prayerTimes.data.prayer_times.maghrib);

// Validate halal medication
const halalStatus = await client.cultural.validateMedication({
  medication_name: 'Paracetamol 500mg',
  manufacturer: 'Duopharma Biotech'
});
console.log('Halal status:', halalStatus.data.halal_status);
```

### Python

```python
import asyncio
from medimate_malaysia import MediMateMalaysia
from medimate_malaysia.models import MalaysianState, SupportedLanguage

async def main():
    async with MediMateMalaysia(
        api_key="mk_live_your_key_here",
        cultural_context={
            'malaysian_state': MalaysianState.KUALA_LUMPUR,
            'preferred_language': SupportedLanguage.MALAY,
            'prayer_time_aware': True,
            'halal_requirements': True
        }
    ) as client:
        # Get prayer times
        prayer_times = await client.cultural.get_prayer_times_async('KUL')
        print(f"Maghrib prayer: {prayer_times.prayer_times['maghrib']}")

        # Validate halal medication
        halal_result = await client.cultural.validate_medication_async(
            'Paracetamol 500mg', 'Duopharma Biotech'
        )
        print(f"Halal status: {halal_result.halal_status}")

if __name__ == "__main__":
    asyncio.run(main())
```

### Java

```java
import my.medimate.malaysia.sdk.client.MediMateMalaysiaClient;
import my.medimate.malaysia.sdk.config.MediMateConfig;
import my.medimate.malaysia.sdk.model.MalaysianState;
import my.medimate.malaysia.sdk.model.PrayerTimesResponse;

public class QuickStart {
    public static void main(String[] args) {
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

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
```

### C# (.NET)

```csharp
using MediMate.Malaysia.SDK.Client;
using MediMate.Malaysia.SDK.Configuration;
using MediMate.Malaysia.SDK.Models;

var config = new MediMateConfig
{
    ApiKey = "mk_live_your_key_here",
    MalaysianState = MalaysianState.KualaLumpur,
    PreferredLanguage = SupportedLanguage.Malay,
    PrayerTimeAware = true,
    HalalRequirements = true
};

using var client = new MediMateMalaysiaClient(config);

// Get prayer times
var prayerTimes = await client.Cultural.GetPrayerTimesAsync(MalaysianState.KualaLumpur);
Console.WriteLine($"Maghrib: {prayerTimes.PrayerTimes["maghrib"]}");

// Validate halal medication
var halalResult = await client.Cultural.ValidateMedicationAsync(
    "Paracetamol 500mg", 
    "Duopharma Biotech");
Console.WriteLine($"Halal Status: {halalResult.HalalStatus}");
```

## Authentication

All API requests require authentication using your API key. Include it in the Authorization header:

```
Authorization: Bearer mk_live_your_key_here
```

### API Key Types

- **Test Keys**: `mk_test_...` - For development and testing
- **Live Keys**: `mk_live_...` - For production use

## Rate Limits

| Environment | Requests per Minute | Requests per Day |
|-------------|-------------------|------------------|
| Development | 100 | 10,000 |
| Production | 500 | 100,000 |
| Enterprise | 2,000 | 1,000,000 |

## Malaysian Cultural Context Headers

Enhance your API requests with cultural context:

```http
X-Malaysian-State: KUL
X-Preferred-Language: ms
X-Prayer-Time-Aware: true
X-Halal-Requirements: true
X-Cultural-Context: Malaysian Healthcare
```

## Core Endpoints Overview

| Service | Endpoint | Purpose |
|---------|----------|---------|
| Prayer Times | `/cultural/prayer-times/{state}` | Get Islamic prayer times |
| Translation | `/cultural/translate` | Translate healthcare text |
| Halal Validation | `/cultural/halal/validate-medication` | Check medication halal status |
| Patient Management | `/patients` | PDPA-compliant patient data |
| Appointments | `/appointments` | Cultural-aware scheduling |
| Medications | `/medications` | Halal medication database |

## Error Handling

```javascript
try {
  const result = await client.cultural.getPrayerTimes('KUL');
} catch (error) {
  if (error.code === 'RATE_LIMIT_ERROR') {
    console.log(`Rate limited. Retry after ${error.retryAfter} seconds`);
  } else if (error.code === 'AUTHENTICATION_ERROR') {
    console.log('Invalid API key');
  } else {
    console.log(`API Error: ${error.code} - ${error.message}`);
    
    // Multi-language error messages
    if (error.culturalMessage) {
      console.log(`Malay: ${error.culturalMessage.ms}`);
    }
  }
}
```

## Next Steps

1. **[Malaysian Healthcare Integration](./02-malaysian-healthcare-integration.md)** - Deep dive into Malaysian healthcare patterns
2. **[Prayer Time Integration](./03-prayer-time-integration.md)** - Implement prayer-aware scheduling
3. **[Halal Medication Validation](./04-halal-validation.md)** - Build halal compliance features
4. **[Multi-Language Support](./05-multi-language.md)** - Add Malaysian language support
5. **[PDPA Compliance](./06-pdpa-compliance.md)** - Ensure data protection compliance

## Support

- 📖 **Documentation**: [docs.medimate.my](https://docs.medimate.my)
- 💬 **Community**: [community.medimate.my](https://community.medimate.my)
- 🐛 **Issues**: GitHub Issues for each SDK
- ✉️ **Email**: sdk@medimate.my

## Malaysian Healthcare Compliance

This API is designed specifically for Malaysian healthcare with:

- **MOH Guidelines**: Follows Ministry of Health Malaysia standards
- **PDPA 2010**: Built-in Personal Data Protection Act compliance
- **Cultural Sensitivity**: Respects Islamic, Buddhist, Christian, Hindu practices
- **Local Integration**: Works with Malaysian healthcare providers and systems

---

**Ready to build Malaysian healthcare solutions? Let's get started! 🇲🇾**