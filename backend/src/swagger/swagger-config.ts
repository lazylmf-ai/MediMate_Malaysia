/**
 * Swagger UI Configuration for MediMate Malaysia Healthcare API
 * Custom Malaysian healthcare theme with cultural intelligence features
 */

import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Load the OpenAPI specification
const swaggerDocument = YAML.load(path.join(__dirname, 'openapi.yaml'));

/**
 * Malaysian Healthcare Swagger UI Options
 */
const swaggerOptions: swaggerUi.SwaggerUiOptions = {
  customCss: `
    /* Malaysian Healthcare Theme */
    .swagger-ui {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    /* Header styling with Malaysian colors */
    .swagger-ui .topbar {
      background: linear-gradient(135deg, #c41230 0%, #006a4e 100%);
      border-bottom: 3px solid #ffcc00;
    }
    
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    
    /* Malaysian flag inspired color scheme */
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      border: 2px solid #006a4e;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
    }
    
    /* Cultural intelligence section highlighting */
    .swagger-ui .opblock-tag-section[data-tag="Cultural Intelligence"] {
      border-left: 4px solid #006a4e;
      background: rgba(0, 106, 78, 0.05);
    }
    
    .swagger-ui .opblock-tag-section[data-tag="Halal Validation"] {
      border-left: 4px solid #c41230;
      background: rgba(196, 18, 48, 0.05);
    }
    
    /* Prayer time and cultural endpoints styling */
    .swagger-ui .opblock.opblock-get .opblock-summary-path[data-path*="prayer-times"] {
      color: #006a4e;
      font-weight: bold;
    }
    
    .swagger-ui .opblock.opblock-post .opblock-summary-path[data-path*="halal"] {
      color: #c41230;
      font-weight: bold;
    }
    
    /* Malaysian context highlighting */
    .swagger-ui .response-col_description .renderedMarkdown p {
      position: relative;
    }
    
    .swagger-ui .response-col_description .renderedMarkdown p:has([data-malaysia]) {
      border-left: 3px solid #ffcc00;
      padding-left: 10px;
      background: rgba(255, 204, 0, 0.1);
    }
    
    /* Custom buttons for Malaysian context */
    .swagger-ui .btn.authorize {
      background: #006a4e;
      border-color: #006a4e;
    }
    
    .swagger-ui .btn.authorize:hover {
      background: #004d39;
      border-color: #004d39;
    }
    
    .swagger-ui .btn.execute {
      background: #c41230;
      border-color: #c41230;
    }
    
    .swagger-ui .btn.execute:hover {
      background: #9d0e26;
      border-color: #9d0e26;
    }
    
    /* Malaysian healthcare info panel */
    .malaysia-healthcare-info {
      background: linear-gradient(135deg, #006a4e 0%, #c41230 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      text-align: center;
    }
    
    .malaysia-healthcare-info h3 {
      margin: 0 0 10px 0;
      color: #ffcc00;
    }
    
    /* Cultural considerations highlighting */
    .swagger-ui .parameters-col_description [data-cultural] {
      background: rgba(0, 106, 78, 0.1);
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #006a4e;
    }
    
    /* Halal validation emphasis */
    .swagger-ui .response-col_description [data-halal] {
      background: rgba(196, 18, 48, 0.1);
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #c41230;
    }
    
    /* Multi-language support indicator */
    .swagger-ui .opblock-description .language-support {
      display: inline-block;
      background: #ffcc00;
      color: #000;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 8px;
    }
    
    /* PDPA compliance indicator */
    .swagger-ui .opblock-description .pdpa-compliant {
      display: inline-block;
      background: #006a4e;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: bold;
      margin-left: 8px;
    }
    
    /* Malaysian state selector styling */
    .swagger-ui select[data-malaysian-states] {
      background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='%23006a4e' viewBox='0 0 16 16'%3e%3cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3e%3c/svg%3e");
    }
    
    /* Islamic prayer time indicator */
    .prayer-time-indicator {
      display: inline-block;
      width: 12px;
      height: 12px;
      background: #006a4e;
      border-radius: 50%;
      margin-right: 6px;
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    
    /* Cultural sensitivity warning */
    .cultural-warning {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
      padding: 12px;
      border-radius: 4px;
      margin: 10px 0;
      border-left: 4px solid #ffcc00;
    }
    
    /* Malaysian healthcare provider styling */
    .moh-approved {
      color: #006a4e;
      font-weight: bold;
    }
    
    .moh-approved::before {
      content: "🏥 ";
    }
    
    /* Responsive design for Malaysian mobile networks */
    @media (max-width: 768px) {
      .swagger-ui .wrapper {
        padding: 0 10px;
      }
      
      .swagger-ui .info {
        padding: 15px 0;
      }
      
      .malaysia-healthcare-info {
        padding: 15px;
        font-size: 14px;
      }
    }
    
    /* Dark mode support for Malaysian theme */
    @media (prefers-color-scheme: dark) {
      .swagger-ui {
        background: #1a1a1a;
        color: #ffffff;
      }
      
      .swagger-ui .scheme-container {
        background: #2d2d2d;
        border-color: #006a4e;
        color: #ffffff;
      }
      
      .malaysia-healthcare-info {
        background: linear-gradient(135deg, #004d39 0%, #9d0e26 100%);
      }
    }
  `,
  
  customJs: `
    // Malaysian Healthcare Swagger UI Enhancements
    window.addEventListener('DOMContentLoaded', function() {
      // Add Malaysian healthcare info panel
      const infoSection = document.querySelector('.swagger-ui .info');
      if (infoSection) {
        const malaysiaInfo = document.createElement('div');
        malaysiaInfo.className = 'malaysia-healthcare-info';
        malaysiaInfo.innerHTML = \`
          <h3>🇲🇾 Malaysian Healthcare API</h3>
          <p><strong>PDPA 2010 Compliant</strong> • <strong>Cultural Intelligence</strong> • <strong>Islamic Healthcare</strong></p>
          <p>Supporting Malaysian healthcare with prayer times, halal validation, and multi-cultural care</p>
          <div style="margin-top: 15px;">
            <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; margin: 0 5px; font-size: 12px;">🕌 Prayer Times</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; margin: 0 5px; font-size: 12px;">✅ Halal Certified</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; margin: 0 5px; font-size: 12px;">🌏 Multi-Language</span>
            <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 12px; margin: 0 5px; font-size: 12px;">🔒 PDPA Protected</span>
          </div>
        \`;
        infoSection.insertBefore(malaysiaInfo, infoSection.firstChild);
      }
      
      // Add prayer time indicators to relevant endpoints
      const prayerEndpoints = document.querySelectorAll('[data-path*="prayer-time"]');
      prayerEndpoints.forEach(endpoint => {
        const indicator = document.createElement('span');
        indicator.className = 'prayer-time-indicator';
        endpoint.parentNode.insertBefore(indicator, endpoint);
      });
      
      // Add cultural warnings where appropriate
      const culturalEndpoints = document.querySelectorAll('[data-path*="cultural"], [data-path*="halal"], [data-path*="ramadan"]');
      culturalEndpoints.forEach(endpoint => {
        const container = endpoint.closest('.opblock-body');
        if (container) {
          const warning = document.createElement('div');
          warning.className = 'cultural-warning';
          warning.innerHTML = \`
            <strong>🕌 Cultural Consideration:</strong> 
            This endpoint provides culturally-sensitive healthcare information for Malaysian patients. 
            Please ensure appropriate context and respect for cultural and religious practices.
          \`;
          container.insertBefore(warning, container.firstChild);
        }
      });
      
      // Add MOH approval indicators
      const mohEndpoints = document.querySelectorAll('[data-path*="medication"], [data-path*="provider"]');
      mohEndpoints.forEach(endpoint => {
        const title = endpoint.querySelector('.opblock-summary-description');
        if (title) {
          title.classList.add('moh-approved');
        }
      });
      
      // Malaysian state code helper
      const stateInputs = document.querySelectorAll('input[placeholder*="state"], input[placeholder*="State"]');
      stateInputs.forEach(input => {
        input.setAttribute('title', 'Malaysian state codes: KUL (Kuala Lumpur), JHR (Johor), PNG (Penang), etc.');
        input.style.borderLeft = '3px solid #006a4e';
      });
      
      // Real-time API status indicator
      let connectionStatus = document.createElement('div');
      connectionStatus.style.cssText = \`
        position: fixed;
        top: 20px;
        right: 20px;
        background: #006a4e;
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 12px;
        z-index: 1000;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      \`;
      connectionStatus.innerHTML = '🟢 API Online';
      document.body.appendChild(connectionStatus);
      
      // Simulate API health check
      fetch('/health')
        .then(response => response.json())
        .then(data => {
          if (data.status === 'healthy') {
            connectionStatus.innerHTML = '🟢 API Healthy';
            connectionStatus.style.background = '#006a4e';
          } else {
            connectionStatus.innerHTML = '🟡 API Degraded';
            connectionStatus.style.background = '#ffa500';
          }
        })
        .catch(() => {
          connectionStatus.innerHTML = '🔴 API Offline';
          connectionStatus.style.background = '#c41230';
        });
    });
  `,
  
  customSiteTitle: 'MediMate Malaysia Healthcare API Documentation',
  customfavIcon: '/favicon-malaysia.ico',
  
  swaggerOptions: {
    // Malaysian cultural enhancements
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    
    // Malaysian API server configuration
    servers: [
      {
        url: 'https://api.medimate.my/v1',
        description: 'Production - Malaysian Healthcare'
      },
      {
        url: 'https://staging-api.medimate.my/v1',
        description: 'Staging - Malaysian Healthcare'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development - Local Malaysian Setup'
      }
    ],
    
    // Cultural and security options
    requestInterceptor: (request: any) => {
      // Add Malaysian cultural context headers
      request.headers['Accept-Language'] = 'ms-MY,en-US;q=0.9,zh-CN;q=0.8,ta-IN;q=0.7';
      request.headers['X-Cultural-Context'] = 'Malaysian Healthcare';
      request.headers['X-Timezone'] = 'Asia/Kuala_Lumpur';
      
      // Add user agent for Malaysian healthcare API
      request.headers['User-Agent'] = 'MediMate-Malaysia-API-Docs/1.0';
      
      return request;
    },
    
    responseInterceptor: (response: any) => {
      // Log prayer time information if present
      if (response.headers['x-prayer-time']) {
        console.log('🕌 Prayer Time Context:', response.headers['x-prayer-time']);
      }
      
      // Log cultural event information
      if (response.headers['x-cultural-event']) {
        console.log('🎉 Cultural Event:', response.headers['x-cultural-event']);
      }
      
      return response;
    },
    
    // Malaysian healthcare-specific tags order
    tagsSorter: (a: string, b: string) => {
      const priorityOrder = [
        'System Health',
        'System Information',
        'Cultural Intelligence',
        'Halal Validation',
        'Cultural Calendar',
        'Patient Management',
        'Appointment Management',
        'Medication Management',
        'Real-time Services',
        'FHIR Integration'
      ];
      
      const indexA = priorityOrder.indexOf(a);
      const indexB = priorityOrder.indexOf(b);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;
      
      return a.localeCompare(b);
    },
    
    // Operations sorting with cultural priority
    operationsSorter: (a: any, b: any) => {
      const culturalEndpoints = ['prayer-times', 'translate', 'halal', 'ramadan', 'cultural'];
      const aCultural = culturalEndpoints.some(endpoint => a.path.includes(endpoint));
      const bCultural = culturalEndpoints.some(endpoint => b.path.includes(endpoint));
      
      if (aCultural && !bCultural) return -1;
      if (!aCultural && bCultural) return 1;
      
      return a.path.localeCompare(b.path);
    }
  }
};

/**
 * Malaysian Healthcare API Documentation Setup
 */
export const setupSwagger = (app: any) => {
  // Serve custom Malaysian favicon
  app.get('/favicon-malaysia.ico', (req: any, res: any) => {
    res.type('image/x-icon');
    // Return Malaysian healthcare favicon (you would put actual favicon data here)
    res.end();
  });
  
  // Malaysian healthcare API documentation endpoint
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  
  // Alternative endpoint for developers
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, swaggerOptions));
  
  // Raw OpenAPI specification endpoint
  app.get('/openapi.json', (req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(swaggerDocument);
  });
  
  app.get('/openapi.yaml', (req: any, res: any) => {
    res.setHeader('Content-Type', 'text/yaml');
    res.sendFile(path.join(__dirname, 'openapi.yaml'));
  });
  
  console.log('✅ Malaysian Healthcare API Documentation initialized');
  console.log('📖 Documentation available at: /api-docs and /docs');
  console.log('🔗 OpenAPI spec available at: /openapi.json and /openapi.yaml');
};

export { swaggerDocument, swaggerOptions };