/**
 * MediMate Malaysia Developer Portal
 * Main dashboard for healthcare API developers
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Tab,
  Tabs,
  Paper,
  Alert,
  LinearProgress,
  Divider,
  IconButton,
  Tooltip,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Code,
  Security,
  Api,
  Speed,
  Language,
  Mosque,
  HealthAndSafety,
  Shield,
  Notifications,
  Documentation,
  CloudDownload,
  Settings,
  PlayArrow,
  Stop,
  Refresh,
  ContentCopy,
  Visibility,
  VisibilityOff,
  CheckCircle,
  Error,
  Warning,
  Info
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Malaysian theme colors
const malaysianTheme = {
  primary: '#006a4e',  // Malaysian green
  secondary: '#c41230', // Malaysian red
  accent: '#ffcc00',   // Malaysian yellow
  background: '#f8f9fa',
  surface: '#ffffff'
};

const StyledCard = styled(Card)(({ theme }) => ({
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
  borderTop: `4px solid ${malaysianTheme.primary}`,
}));

const CulturalFeatureCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${malaysianTheme.primary}15 0%, ${malaysianTheme.secondary}15 100%)`,
  border: `1px solid ${malaysianTheme.primary}30`,
  '&:hover': {
    background: `linear-gradient(135deg, ${malaysianTheme.primary}25 0%, ${malaysianTheme.secondary}25 100%)`,
  }
}));

const StatsCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  textAlign: 'center',
  background: `linear-gradient(135deg, ${malaysianTheme.primary} 0%, ${malaysianTheme.secondary} 100%)`,
  color: 'white',
  '& .MuiTypography-h4': {
    fontWeight: 'bold',
    color: malaysianTheme.accent
  }
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`developer-portal-tabpanel-${index}`}
      aria-labelledby={`developer-portal-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DeveloperPortal: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [apiKeys, setApiKeys] = useState([]);
  const [apiStatus, setApiStatus] = useState('checking');
  const [showApiKey, setShowApiKey] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState('');
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);

  // Mock API data
  const mockApiStats = {
    totalRequests: '125,847',
    monthlyRequests: '28,492',
    averageResponseTime: '145ms',
    uptime: '99.97%',
    culturalApiUsage: '76%',
    halalValidations: '3,428',
    prayerTimeRequests: '15,672'
  };

  const mockApiKeys = [
    {
      id: '1',
      name: 'Production API Key',
      key: 'mk_live_1234567890abcdef1234567890abcdef',
      created: '2024-03-01',
      lastUsed: '2024-03-15',
      requests: 125847,
      status: 'active'
    },
    {
      id: '2',
      name: 'Development API Key',
      key: 'mk_test_abcdef1234567890abcdef1234567890',
      created: '2024-02-15',
      lastUsed: '2024-03-14',
      requests: 45623,
      status: 'active'
    }
  ];

  useEffect(() => {
    // Simulate API health check
    setTimeout(() => {
      setApiStatus('healthy');
    }, 1000);

    setApiKeys(mockApiKeys as any);
  }, []);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGenerateApiKey = () => {
    setKeyDialogOpen(true);
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    // Show success message
  };

  const culturalFeatures = [
    {
      icon: <Mosque />,
      title: 'Prayer Time Integration',
      description: 'Integrate Malaysian prayer times for all 13 states with healthcare scheduling',
      endpoint: '/api/cultural/prayer-times/{stateCode}',
      badge: 'Real-time'
    },
    {
      icon: <Language />,
      title: 'Multi-Language Support',
      description: 'Translate healthcare content to Bahasa Malaysia, Chinese, Tamil with medical accuracy',
      endpoint: '/api/cultural/translate',
      badge: 'AI-Powered'
    },
    {
      icon: <HealthAndSafety />,
      title: 'Halal Medication Validation',
      description: 'Validate medications and treatments according to Islamic guidelines',
      endpoint: '/api/cultural/halal/validate-medication',
      badge: 'JAKIM Certified'
    },
    {
      icon: <Shield />,
      title: 'PDPA Compliance',
      description: 'Built-in PDPA 2010 compliance for Malaysian patient data protection',
      endpoint: '/api/v1/patients',
      badge: 'Legal Compliant'
    }
  ];

  const quickStartGuides = [
    {
      title: 'Patient Registration with MyKad',
      description: 'Integrate Malaysian MyKad validation and cultural preferences',
      duration: '10 min',
      difficulty: 'Beginner'
    },
    {
      title: 'Prayer Time Aware Scheduling',
      description: 'Build appointment systems that respect Islamic prayer times',
      duration: '15 min',
      difficulty: 'Intermediate'
    },
    {
      title: 'Halal Medication Search',
      description: 'Implement halal medication filtering and alternatives',
      duration: '20 min',
      difficulty: 'Intermediate'
    },
    {
      title: 'Ramadan Healthcare Adjustments',
      description: 'Handle healthcare services during Ramadan with cultural sensitivity',
      duration: '25 min',
      difficulty: 'Advanced'
    }
  ];

  const sdkOptions = [
    {
      name: 'JavaScript/TypeScript',
      description: 'Full-featured SDK with TypeScript definitions',
      version: 'v1.2.1',
      downloads: '12.5K',
      icon: '🟨'
    },
    {
      name: 'Python',
      description: 'Pythonic interface with async support',
      version: 'v1.2.0',
      downloads: '8.7K',
      icon: '🐍'
    },
    {
      name: 'Java',
      description: 'Enterprise-ready with Spring Boot integration',
      version: 'v1.1.9',
      downloads: '6.2K',
      icon: '☕'
    },
    {
      name: '.NET',
      description: 'Native C# SDK with Entity Framework support',
      version: 'v1.1.8',
      downloads: '4.8K',
      icon: '🔷'
    }
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar
                sx={{ 
                  bgcolor: malaysianTheme.primary, 
                  mr: 2, 
                  width: 56, 
                  height: 56 
                }}
              >
                🇲🇾
              </Avatar>
              <Box>
                <Typography variant="h3" component="h1" fontWeight="bold">
                  MediMate Malaysia
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Healthcare API Developer Portal
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Chip 
                label="PDPA 2010 Compliant" 
                color="success" 
                size="small" 
                icon={<Shield />} 
              />
              <Chip 
                label="Cultural Intelligence" 
                sx={{ bgcolor: malaysianTheme.primary, color: 'white' }} 
                size="small" 
                icon={<Mosque />} 
              />
              <Chip 
                label="Multi-Language" 
                color="info" 
                size="small" 
                icon={<Language />} 
              />
              <Chip 
                label="Halal Certified" 
                sx={{ bgcolor: malaysianTheme.secondary, color: 'white' }} 
                size="small" 
                icon={<HealthAndSafety />} 
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                API Status
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                {apiStatus === 'checking' ? (
                  <>
                    <LinearProgress sx={{ width: 100, mr: 1 }} />
                    <Typography variant="body2">Checking...</Typography>
                  </>
                ) : (
                  <>
                    <CheckCircle sx={{ color: 'success.main', mr: 1 }} />
                    <Typography variant="body2" color="success.main" fontWeight="bold">
                      API Healthy
                    </Typography>
                  </>
                )}
              </Box>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Uptime: {mockApiStats.uptime} • Response: {mockApiStats.averageResponseTime}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* API Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h4">{mockApiStats.totalRequests}</Typography>
            <Typography variant="body2">Total API Calls</Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h4">{mockApiStats.monthlyRequests}</Typography>
            <Typography variant="body2">This Month</Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h4">{mockApiStats.halalValidations}</Typography>
            <Typography variant="body2">Halal Validations</Typography>
          </StatsCard>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatsCard>
            <Typography variant="h4">{mockApiStats.prayerTimeRequests}</Typography>
            <Typography variant="body2">Prayer Time Requests</Typography>
          </StatsCard>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minWidth: 120
            }
          }}
        >
          <Tab label="Overview" icon={<Api />} iconPosition="start" />
          <Tab label="API Keys" icon={<Security />} iconPosition="start" />
          <Tab label="Documentation" icon={<Documentation />} iconPosition="start" />
          <Tab label="SDKs" icon={<CloudDownload />} iconPosition="start" />
          <Tab label="Sandbox" icon={<PlayArrow />} iconPosition="start" />
          <Tab label="Cultural APIs" icon={<Mosque />} iconPosition="start" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Cultural Features */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                🇲🇾 Malaysian Healthcare Features
              </Typography>
              <Grid container spacing={2}>
                {culturalFeatures.map((feature, index) => (
                  <Grid item xs={12} md={6} key={index}>
                    <CulturalFeatureCard>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                          <Avatar sx={{ bgcolor: malaysianTheme.primary, mr: 2 }}>
                            {feature.icon}
                          </Avatar>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                              <Typography variant="h6" fontWeight="bold">
                                {feature.title}
                              </Typography>
                              <Chip 
                                label={feature.badge} 
                                size="small" 
                                sx={{ ml: 1, bgcolor: malaysianTheme.accent, color: 'black' }}
                              />
                            </Box>
                            <Typography variant="body2" color="text.secondary" paragraph>
                              {feature.description}
                            </Typography>
                            <Box sx={{ 
                              bgcolor: 'background.paper', 
                              p: 1, 
                              borderRadius: 1,
                              border: '1px solid #e0e0e0',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem'
                            }}>
                              GET {feature.endpoint}
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </CulturalFeatureCard>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Quick Start Guides */}
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom fontWeight="bold">
                🚀 Quick Start Guides
              </Typography>
              <Grid container spacing={2}>
                {quickStartGuides.map((guide, index) => (
                  <Grid item xs={12} sm={6} md={3} key={index}>
                    <StyledCard>
                      <CardContent>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {guide.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {guide.description}
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Box>
                            <Chip label={guide.duration} size="small" variant="outlined" />
                            <Chip 
                              label={guide.difficulty} 
                              size="small" 
                              color={guide.difficulty === 'Beginner' ? 'success' : guide.difficulty === 'Intermediate' ? 'warning' : 'error'}
                              sx={{ ml: 1 }}
                            />
                          </Box>
                          <Button size="small" endIcon={<PlayArrow />}>
                            Start
                          </Button>
                        </Box>
                      </CardContent>
                    </StyledCard>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </TabPanel>

        {/* API Keys Tab */}
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" fontWeight="bold">
              API Keys Management
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<Security />}
              onClick={handleGenerateApiKey}
              sx={{ bgcolor: malaysianTheme.primary }}
            >
              Generate New Key
            </Button>
          </Box>

          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>Security Notice:</strong> Keep your API keys secure and never expose them in client-side code. 
            All keys are PDPA 2010 compliant and include Malaysian healthcare audit trails.
          </Alert>

          <Grid container spacing={2}>
            {apiKeys.map((key: any) => (
              <Grid item xs={12} key={key.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight="bold" gutterBottom>
                          {key.name}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontFamily: 'monospace',
                              bgcolor: 'background.paper',
                              p: 1,
                              borderRadius: 1,
                              border: '1px solid #e0e0e0',
                              mr: 1,
                              flex: 1
                            }}
                          >
                            {showApiKey && selectedApiKey === key.id ? key.key : `${key.key.substring(0, 12)}...${key.key.substring(key.key.length - 8)}`}
                          </Typography>
                          <IconButton 
                            size="small" 
                            onClick={() => {
                              if (selectedApiKey === key.id) {
                                setShowApiKey(!showApiKey);
                              } else {
                                setSelectedApiKey(key.id);
                                setShowApiKey(true);
                              }
                            }}
                          >
                            {showApiKey && selectedApiKey === key.id ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                          <IconButton size="small" onClick={() => handleCopyApiKey(key.key)}>
                            <ContentCopy />
                          </IconButton>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Created: {key.created}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Last Used: {key.lastUsed}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Requests: {key.requests.toLocaleString()}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={key.status === 'active' ? 'Active' : 'Inactive'} 
                        color={key.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* Documentation Tab */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                📖 API Documentation
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Comprehensive documentation for the MediMate Malaysia Healthcare API with cultural intelligence features.
              </Typography>

              <List>
                <ListItem button component="a" href="/api-docs" target="_blank">
                  <ListItemIcon>
                    <Api sx={{ color: malaysianTheme.primary }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Interactive API Explorer (Swagger UI)"
                    secondary="Test API endpoints with Malaysian healthcare examples"
                  />
                </ListItem>
                <ListItem button component="a" href="/openapi.yaml" target="_blank">
                  <ListItemIcon>
                    <Code sx={{ color: malaysianTheme.secondary }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="OpenAPI 3.0 Specification"
                    secondary="Download the complete API specification"
                  />
                </ListItem>
                <ListItem button>
                  <ListItemIcon>
                    <Mosque sx={{ color: malaysianTheme.primary }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Cultural Intelligence Guide"
                    secondary="Learn how to integrate Malaysian healthcare culture"
                  />
                </ListItem>
                <ListItem button>
                  <ListItemIcon>
                    <Shield sx={{ color: malaysianTheme.secondary }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary="PDPA Compliance Guide"
                    secondary="Understand Malaysian data protection requirements"
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    🎯 Popular Endpoints
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText 
                        primary="GET /cultural/prayer-times/{state}"
                        secondary="92% of developers use this"
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="POST /cultural/halal/validate-medication"
                        secondary="78% of developers use this"
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="POST /cultural/translate"
                        secondary="65% of developers use this"
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemText 
                        primary="GET /patients"
                        secondary="89% of developers use this"
                        primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }}
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* SDKs Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            📦 Official SDKs
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Download our official SDKs with built-in Malaysian healthcare features, cultural intelligence, and PDPA compliance.
          </Typography>

          <Grid container spacing={3}>
            {sdkOptions.map((sdk, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <StyledCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h4">{sdk.icon}</Typography>
                      <Box sx={{ ml: 2 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {sdk.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {sdk.version}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {sdk.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary">
                        {sdk.downloads} downloads
                      </Typography>
                      <Button 
                        size="small" 
                        variant="contained"
                        startIcon={<CloudDownload />}
                        sx={{ bgcolor: malaysianTheme.primary }}
                      >
                        Download
                      </Button>
                    </Box>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" fontWeight="bold" gutterBottom>
            🛠️ Code Examples
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            All SDKs include built-in support for Malaysian cultural features, prayer time integration, and PDPA compliance.
          </Alert>

          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', fontFamily: 'monospace', fontSize: '0.875rem' }}>
            <Typography variant="body2" component="pre">
{`// JavaScript/TypeScript SDK Example
import { MediMateMalaysia } from '@medimate/malaysia-sdk';

const client = new MediMateMalaysia({
  apiKey: 'your-api-key',
  culturalContext: 'malaysian-healthcare'
});

// Get prayer times for Kuala Lumpur
const prayerTimes = await client.cultural.getPrayerTimes('KUL');

// Validate halal medication
const halalStatus = await client.cultural.validateMedication({
  name: 'Paracetamol 500mg',
  manufacturer: 'Duopharma Biotech'
});

// Create PDPA-compliant patient record
const patient = await client.patients.create({
  personalInfo: { /* ... */ },
  culturalPreferences: {
    primaryLanguage: 'ms',
    halalMedicationOnly: true,
    prayerTimeNotifications: true
  },
  pdpaConsent: { /* ... */ }
});`}
            </Typography>
          </Paper>
        </TabPanel>

        {/* Sandbox Tab */}
        <TabPanel value={tabValue} index={4}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            🧪 API Testing Sandbox
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Test your integrations with realistic Malaysian healthcare data in a safe environment.
          </Typography>

          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>Sandbox Features:</strong> Pre-loaded with Malaysian patient data, prayer times, 
            halal medications, and cultural scenarios for comprehensive testing.
          </Alert>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    🏥 Test Data Sets
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="500+ Malaysian Patients"
                        secondary="With MyKad numbers, cultural preferences"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="13 Malaysian States Prayer Times"
                        secondary="Real-time updated daily"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="1000+ Halal Medications"
                        secondary="JAKIM certified database"
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <CheckCircle color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Cultural Calendar Events"
                        secondary="Ramadan, Eid, Chinese New Year, Deepavali"
                      />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    ⚡ Quick Test Scenarios
                  </Typography>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    startIcon={<PlayArrow />}
                  >
                    Test Prayer Time Scheduling Conflict
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    startIcon={<PlayArrow />}
                  >
                    Validate Halal Medication Search
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    startIcon={<PlayArrow />}
                  >
                    Multi-Language Translation Test
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    startIcon={<PlayArrow />}
                  >
                    PDPA Compliance Workflow
                  </Button>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    sx={{ mb: 1, justifyContent: 'flex-start' }}
                    startIcon={<PlayArrow />}
                  >
                    Ramadan Healthcare Adjustments
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Cultural APIs Tab */}
        <TabPanel value={tabValue} index={5}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            🕌 Malaysian Cultural Intelligence APIs
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Specialized APIs designed for Malaysian healthcare with cultural and religious considerations.
          </Typography>

          <Grid container spacing={3}>
            {culturalFeatures.map((feature, index) => (
              <Grid item xs={12} key={index}>
                <StyledCard>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <Avatar sx={{ bgcolor: malaysianTheme.primary, mr: 3, width: 56, height: 56 }}>
                        {feature.icon}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                          <Typography variant="h5" fontWeight="bold">
                            {feature.title}
                          </Typography>
                          <Chip 
                            label={feature.badge} 
                            size="small" 
                            sx={{ 
                              ml: 2, 
                              bgcolor: malaysianTheme.accent, 
                              color: 'black',
                              fontWeight: 'bold'
                            }}
                          />
                        </Box>
                        <Typography variant="body1" color="text.secondary" paragraph>
                          {feature.description}
                        </Typography>
                        <Box sx={{ 
                          bgcolor: 'background.paper', 
                          p: 2, 
                          borderRadius: 1,
                          border: '1px solid #e0e0e0',
                          mb: 2
                        }}>
                          <Typography variant="body2" fontWeight="bold" gutterBottom>
                            API Endpoint:
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {feature.endpoint}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button 
                            variant="contained" 
                            size="small"
                            sx={{ bgcolor: malaysianTheme.primary }}
                            startIcon={<Documentation />}
                          >
                            View Docs
                          </Button>
                          <Button 
                            variant="outlined" 
                            size="small"
                            startIcon={<PlayArrow />}
                          >
                            Try in Sandbox
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </StyledCard>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Paper>

      {/* API Key Generation Dialog */}
      <Dialog open={keyDialogOpen} onClose={() => setKeyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate New API Key</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Create a new API key for accessing the MediMate Malaysia Healthcare API. 
            This key will have full access to cultural intelligence features and PDPA-compliant endpoints.
          </Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <strong>Security Notice:</strong> API keys provide full access to your account. 
            Store them securely and never share them publicly.
          </Alert>

          <Typography variant="body2" gutterBottom>
            Key Name:
          </Typography>
          <input 
            type="text" 
            placeholder="Enter key name (e.g., Production Key)"
            style={{ 
              width: '100%', 
              padding: '12px', 
              border: '1px solid #e0e0e0',
              borderRadius: '4px',
              fontSize: '16px'
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setKeyDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={() => setKeyDialogOpen(false)} 
            variant="contained"
            sx={{ bgcolor: malaysianTheme.primary }}
          >
            Generate Key
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default DeveloperPortal;