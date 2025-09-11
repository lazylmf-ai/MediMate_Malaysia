/**
 * Authentication Redux Slice
 * 
 * Manages authentication state, user data, and token management.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { oauthService } from '@/services/oauth';
import { storageService } from '@/services/storage';
import type { AuthState, User, AuthTokens, LoginRequest, RegisterRequest } from '@/types/auth';

// Initial state
const initialState: AuthState = {
  user: null,
  tokens: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async thunks
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.login(credentials);
      
      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Store tokens and user data
        await storageService.storeTokens(tokens);
        await storageService.storeUserData(user);
        
        return { user, tokens };
      }
      
      return rejectWithValue(response.error || 'Login failed');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await apiService.register(userData);
      
      if (response.success && response.data) {
        const { user } = response.data;
        
        // After registration, user needs to login
        return { user };
      }
      
      return rejectWithValue(response.error || 'Registration failed');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Registration failed');
    }
  }
);

export const loginWithOAuth = createAsyncThunk(
  'auth/loginWithOAuth',
  async (_, { rejectWithValue }) => {
    try {
      const result = await oauthService.login();
      
      if (result.success && result.user && result.tokens) {
        return { user: result.user, tokens: result.tokens };
      }
      
      return rejectWithValue(result.error || 'OAuth login failed');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'OAuth login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await apiService.logout();
      await oauthService.logout();
      return true;
    } catch (error) {
      // Continue with logout even if API call fails
      await storageService.clearAllData();
      return true;
    }
  }
);

export const refreshTokens = createAsyncThunk(
  'auth/refreshTokens',
  async (_, { rejectWithValue }) => {
    try {
      const success = await oauthService.refreshTokens();
      if (success) {
        const newTokens = {
          accessToken: await storageService.getAccessToken(),
          refreshToken: await storageService.getRefreshToken(),
          expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        };
        
        return newTokens;
      }
      
      return rejectWithValue('Token refresh failed');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Token refresh failed');
    }
  }
);

export const loadStoredUser = createAsyncThunk(
  'auth/loadStoredUser',
  async (_, { rejectWithValue }) => {
    try {
      const isAuthenticated = await oauthService.isAuthenticated();
      
      if (isAuthenticated) {
        const user = await storageService.getUserData();
        const accessToken = await storageService.getAccessToken();
        const refreshToken = await storageService.getRefreshToken();
        
        if (user && accessToken && refreshToken) {
          const tokens: AuthTokens = {
            accessToken,
            refreshToken,
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          };
          
          return { user, tokens };
        }
      }
      
      return rejectWithValue('No valid stored session');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load stored user');
    }
  }
);

// Auth slice
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
  extraReducers: (builder) => {
    // Login User
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload as string;
      });

    // Register User
    builder
      .addCase(registerUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
        // User is not automatically logged in after registration
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // OAuth Login
    builder
      .addCase(loginWithOAuth.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginWithOAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(loginWithOAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = action.payload as string;
      });

    // Logout User
    builder
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
        state.error = null;
        state.isLoading = false;
      });

    // Refresh Tokens
    builder
      .addCase(refreshTokens.fulfilled, (state, action) => {
        state.tokens = action.payload as AuthTokens;
      })
      .addCase(refreshTokens.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      });

    // Load Stored User
    builder
      .addCase(loadStoredUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadStoredUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tokens = action.payload.tokens;
        state.error = null;
      })
      .addCase(loadStoredUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tokens = null;
      });
  },
});

export const { clearError, setLoading, updateUser } = authSlice.actions;
export default authSlice.reducer;