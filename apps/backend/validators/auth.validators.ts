import { z } from "zod/v4";

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, "Refresh token is required"),
});

export const otpSendSchema = z.object({
  email: z.email("Invalid email address"),
});

export const otpVerifySchema = z.object({
  email: z.email("Invalid email address"),
  token: z.string().min(1, "Verification code is required"),
});

export const signupSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const signinSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
  redirect_url: z.url("Invalid redirect URL"),
});

export const resetPasswordSchema = z.object({
  token_hash: z.string().min(1, "Token hash is required"),
  new_password: z.string().min(8, "Password must be at least 8 characters"),
});
