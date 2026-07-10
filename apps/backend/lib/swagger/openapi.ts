export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Locusify Backend API",
    version: "1.0.0",
    description:
      "Backend API for the Locusify platform. Provides authentication, user profiles, subscriptions, redemption codes, and usage tracking.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health", description: "Health check" },
    { name: "Auth", description: "Authentication and authorization" },
    { name: "Profile", description: "User profile management" },
    {
      name: "Subscriptions",
      description: "Subscription and provider management",
    },
    { name: "Redemptions", description: "Redemption code operations" },
    { name: "Usage", description: "Feature usage tracking and querying" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http" as const,
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
    schemas: {
      ApiErrorResponse: {
        type: "object" as const,
        properties: {
          success: { type: "boolean" as const, enum: [false] },
          error: {
            type: "object" as const,
            properties: {
              code: {
                type: "string" as const,
                enum: [
                  "VALIDATION_ERROR",
                  "UNAUTHORIZED",
                  "FORBIDDEN",
                  "NOT_FOUND",
                  "CONFLICT",
                  "GONE",
                  "INTERNAL_ERROR",
                ],
              },
              message: {
                type: "object" as const,
                properties: {
                  en: { type: "string" as const },
                  zh: { type: "string" as const },
                },
                required: ["en", "zh"],
              },
              details: {},
            },
            required: ["code", "message"],
          },
        },
        required: ["success", "error"],
      },
      Profile: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          display_name: {
            type: ["string", "null"] as const,
          },
          avatar_url: {
            type: ["string", "null"] as const,
          },
          provider: {
            type: ["string", "null"] as const,
          },
          created_at: { type: "string" as const, format: "date-time" },
          updated_at: { type: "string" as const, format: "date-time" },
        },
        required: [
          "id",
          "display_name",
          "avatar_url",
          "provider",
          "created_at",
          "updated_at",
        ],
      },
      Subscription: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          user_id: { type: "string" as const, format: "uuid" },
          plan: {
            type: "string" as const,
            enum: ["free", "pro", "max"],
          },
          status: {
            type: "string" as const,
            enum: ["active", "canceled", "expired", "past_due"],
          },
          current_period_end: {
            type: ["string", "null"] as const,
            format: "date-time",
          },
          cancel_at_period_end: { type: "boolean" as const },
          provider: { type: "string" as const },
          created_at: { type: "string" as const, format: "date-time" },
          updated_at: { type: "string" as const, format: "date-time" },
        },
        required: [
          "id",
          "user_id",
          "plan",
          "status",
          "current_period_end",
          "cancel_at_period_end",
          "provider",
          "created_at",
          "updated_at",
        ],
      },
      SubscriptionProvider: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          subscription_id: { type: "string" as const, format: "uuid" },
          provider: { type: "string" as const },
          external_customer_id: {
            type: ["string", "null"] as const,
          },
          external_subscription_id: {
            type: ["string", "null"] as const,
          },
          created_at: { type: "string" as const, format: "date-time" },
        },
        required: [
          "id",
          "subscription_id",
          "provider",
          "external_customer_id",
          "external_subscription_id",
          "created_at",
        ],
      },
      Redemption: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          code_id: { type: "string" as const, format: "uuid" },
          user_id: { type: "string" as const, format: "uuid" },
          plan: {
            type: "string" as const,
            enum: ["free", "pro", "max"],
          },
          duration_days: { type: "integer" as const },
          redeemed_at: { type: "string" as const, format: "date-time" },
        },
        required: [
          "id",
          "code_id",
          "user_id",
          "plan",
          "duration_days",
          "redeemed_at",
        ],
      },
      UsageRecord: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const, format: "uuid" },
          user_id: { type: "string" as const, format: "uuid" },
          feature: { type: "string" as const },
          used_at: { type: "string" as const, format: "date-time" },
        },
        required: ["id", "user_id", "feature", "used_at"],
      },
    },
  },
  paths: {
    // ─── Health ───
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        operationId: "healthCheck",
        responses: {
          "200": {
            description: "Service is healthy",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        status: {
                          type: "string" as const,
                          enum: ["ok"],
                        },
                        timestamp: {
                          type: "string" as const,
                          format: "date-time",
                        },
                      },
                      required: ["status", "timestamp"],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
        },
      },
    },

    // ─── Auth: refresh ───
    "/api/v1/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Refresh access token",
        operationId: "refreshToken",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  refresh_token: {
                    type: "string" as const,
                    minLength: 1,
                  },
                },
                required: ["refresh_token"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Token refreshed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        access_token: { type: "string" as const },
                        refresh_token: { type: "string" as const },
                        expires_in: { type: "integer" as const },
                      },
                      required: [
                        "access_token",
                        "refresh_token",
                        "expires_in",
                      ],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Invalid or expired refresh token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Auth: callback ───
    "/api/v1/auth/callback": {
      get: {
        tags: ["Auth"],
        summary: "OAuth callback (redirects to frontend)",
        operationId: "authCallback",
        parameters: [
          {
            name: "code",
            in: "query" as const,
            required: true,
            schema: { type: "string" as const },
            description: "OAuth authorization code",
          },
        ],
        responses: {
          "307": {
            description:
              "Redirects to frontend with tokens or error. Success: `{FRONTEND_URL}/auth/callback?access_token=...&refresh_token=...`. Error: `{FRONTEND_URL}/auth/error?error=...`",
          },
        },
      },
    },

    // ─── Auth: OAuth initiate ───
    "/api/v1/auth/oauth/{provider}": {
      get: {
        tags: ["Auth"],
        summary: "Initiate OAuth login (redirects to provider)",
        operationId: "oauthInitiate",
        parameters: [
          {
            name: "provider",
            in: "path" as const,
            required: true,
            schema: {
              type: "string" as const,
              enum: ["google", "github"],
            },
            description: "OAuth provider",
          },
        ],
        responses: {
          "307": {
            description:
              "Redirects to the OAuth provider's authorization page",
          },
          "400": {
            description: "Invalid provider",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "500": {
            description: "Failed to initiate OAuth flow",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Auth: OTP send ───
    "/api/v1/auth/otp": {
      post: {
        tags: ["Auth"],
        summary: "Send OTP verification code to email",
        operationId: "otpSend",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  email: {
                    type: "string" as const,
                    format: "email",
                  },
                },
                required: ["email"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification code sent",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        message: { type: "string" as const },
                      },
                      required: ["message"],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Auth: OTP verify ───
    "/api/v1/auth/otp/verify": {
      post: {
        tags: ["Auth"],
        summary: "Verify OTP code and get tokens",
        operationId: "otpVerify",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  email: {
                    type: "string" as const,
                    format: "email",
                  },
                  token: {
                    type: "string" as const,
                    minLength: 1,
                    description: "Verification code from email",
                  },
                },
                required: ["email", "token"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Verification successful",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        access_token: { type: "string" as const },
                        refresh_token: { type: "string" as const },
                        expires_in: { type: "integer" as const },
                        user: {
                          type: "object" as const,
                          properties: {
                            id: {
                              type: "string" as const,
                              format: "uuid",
                            },
                            email: {
                              type: "string" as const,
                              format: "email",
                            },
                          },
                          required: ["id", "email"],
                        },
                      },
                      required: [
                        "access_token",
                        "refresh_token",
                        "expires_in",
                        "user",
                      ],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Invalid or expired verification code",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Auth: logout ───
    "/api/v1/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Log out the current user",
        operationId: "logout",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        message: { type: "string" as const },
                      },
                      required: ["message"],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Auth: me ───
    "/api/v1/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user info",
        operationId: "getMe",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user info",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        id: {
                          type: "string" as const,
                          format: "uuid",
                        },
                        email: {
                          type: "string" as const,
                          format: "email",
                        },
                        created_at: {
                          type: "string" as const,
                          format: "date-time",
                        },
                        last_sign_in_at: {
                          type: "string" as const,
                          format: "date-time",
                        },
                      },
                      required: [
                        "id",
                        "email",
                        "created_at",
                        "last_sign_in_at",
                      ],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Profile ───
    "/api/v1/profile": {
      get: {
        tags: ["Profile"],
        summary: "Get current user profile",
        operationId: "getProfile",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User profile",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: { $ref: "#/components/schemas/Profile" },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "Profile not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Profile"],
        summary: "Update current user profile",
        operationId: "updateProfile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  display_name: {
                    type: "string" as const,
                    minLength: 1,
                    maxLength: 100,
                  },
                  avatar_url: {
                    type: "string" as const,
                    format: "uri",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: { $ref: "#/components/schemas/Profile" },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Subscriptions ───
    "/api/v1/subscriptions": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get current user subscription",
        operationId: "getSubscription",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "User subscription",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: { $ref: "#/components/schemas/Subscription" },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "Subscription not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Subscription providers ───
    "/api/v1/subscriptions/providers": {
      get: {
        tags: ["Subscriptions"],
        summary: "Get subscription providers for current user",
        operationId: "getSubscriptionProviders",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Subscription providers",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        subscription_id: {
                          type: "string" as const,
                          format: "uuid",
                        },
                        providers: {
                          type: "array" as const,
                          items: {
                            $ref: "#/components/schemas/SubscriptionProvider",
                          },
                        },
                      },
                      required: ["subscription_id", "providers"],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "Subscription not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Redemptions: list ───
    "/api/v1/redemptions": {
      get: {
        tags: ["Redemptions"],
        summary: "List redemption history for current user",
        operationId: "listRedemptions",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "List of redemptions (ordered by redeemed_at desc)",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "array" as const,
                      items: { $ref: "#/components/schemas/Redemption" },
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Redemptions: validate ───
    "/api/v1/redemptions/validate": {
      post: {
        tags: ["Redemptions"],
        summary: "Validate a redemption code without redeeming",
        operationId: "validateRedemptionCode",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  code: { type: "string" as const, minLength: 1 },
                },
                required: ["code"],
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Code is valid",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "object" as const,
                      properties: {
                        valid: {
                          type: "boolean" as const,
                          enum: [true],
                        },
                        plan: {
                          type: "string" as const,
                          enum: ["free", "pro", "max"],
                        },
                        duration_days: { type: "integer" as const },
                        remaining_uses: { type: "integer" as const },
                      },
                      required: [
                        "valid",
                        "plan",
                        "duration_days",
                        "remaining_uses",
                      ],
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "Redemption code not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "410": {
            description: "Code inactive, max uses reached, or expired",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Redemptions: redeem ───
    "/api/v1/redemptions/redeem": {
      post: {
        tags: ["Redemptions"],
        summary: "Redeem a code",
        operationId: "redeemCode",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  code: { type: "string" as const, minLength: 1 },
                },
                required: ["code"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Code redeemed successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: { $ref: "#/components/schemas/Redemption" },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "404": {
            description: "Redemption code not found",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "409": {
            description: "Already redeemed this code",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "410": {
            description: "Code inactive, max uses reached, or expired",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

    // ─── Usage ───
    "/api/v1/usage": {
      post: {
        tags: ["Usage"],
        summary: "Track a feature usage event",
        operationId: "trackUsage",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object" as const,
                properties: {
                  feature: {
                    type: "string" as const,
                    minLength: 1,
                    maxLength: 100,
                  },
                },
                required: ["feature"],
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Usage tracked successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: { $ref: "#/components/schemas/UsageRecord" },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Validation error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
      get: {
        tags: ["Usage"],
        summary: "Query usage records for current user",
        operationId: "queryUsage",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "feature",
            in: "query" as const,
            required: false,
            schema: { type: "string" as const },
            description: "Filter by feature name",
          },
          {
            name: "from",
            in: "query" as const,
            required: false,
            schema: { type: "string" as const, format: "date-time" },
            description:
              "Lower bound on used_at (ISO 8601 datetime with offset)",
          },
          {
            name: "to",
            in: "query" as const,
            required: false,
            schema: { type: "string" as const, format: "date-time" },
            description:
              "Upper bound on used_at (ISO 8601 datetime with offset)",
          },
        ],
        responses: {
          "200": {
            description:
              "List of usage records (ordered by used_at desc)",
            content: {
              "application/json": {
                schema: {
                  type: "object" as const,
                  properties: {
                    success: { type: "boolean" as const, enum: [true] },
                    data: {
                      type: "array" as const,
                      items: {
                        $ref: "#/components/schemas/UsageRecord",
                      },
                    },
                  },
                  required: ["success", "data"],
                },
              },
            },
          },
          "400": {
            description: "Invalid query parameters",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
          "401": {
            description: "Missing or invalid token",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiErrorResponse" },
              },
            },
          },
        },
      },
    },

  },
} as const;
