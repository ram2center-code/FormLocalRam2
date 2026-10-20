// server/src/app.ts
import "dotenv/config";
import os from "os";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

// server/src/modules/auth/auth.routes.ts
import { Router } from "express";

// server/src/modules/auth/auth.service.ts
import bcrypt from "bcryptjs";

// server/src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
var DEFAULT_SUPABASE_URL = "postgresql://postgres.pgokdsqumwbitqtptuom:ram2Ram2@10666@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";
var globalForPrisma = globalThis;
function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    const databaseUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL;
    globalForPrisma.prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      },
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
    });
  }
  return globalForPrisma.prisma;
}
var prisma = new Proxy({}, {
  get(_target, prop) {
    const client = getPrismaClient();
    const value = client[prop];
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  }
});

// server/src/utils/jwt.ts
import jwt from "jsonwebtoken";
var ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "fallback-access-secret-change-in-env";
var REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-change-in-env";
var ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
var REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
var signAccessToken = (payload) => {
  return jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN
  });
};
var signRefreshToken = (payload) => {
  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN
  });
};
var verifyAccessToken = (token) => {
  return jwt.verify(token, ACCESS_SECRET);
};
var verifyRefreshToken = (token) => {
  return jwt.verify(token, REFRESH_SECRET);
};

// server/src/modules/auditLog/auditLog.service.ts
import { Prisma } from "@prisma/client";
var createAuditLog = async (params) => {
  try {
    return await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entity: params.entity ?? null,
        entityId: params.entityId ?? null,
        meta: params.meta ?? Prisma.JsonNull,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null
      }
    });
  } catch (error) {
    console.error("\u26A0\uFE0F [AuditLog Failed to record]:", error);
    return null;
  }
};

// server/src/modules/auth/auth.service.ts
var AuthService = class {
  static async login(input, meta) {
    const { username, password } = input;
    const user = await prisma.user.findUnique({
      where: { username },
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    });
    if (!user) {
      await createAuditLog({
        userId: null,
        action: "LOGIN_FAILED",
        entity: "User",
        meta: { username, reason: "User not found" },
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      throw new Error("\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    if (!user.isActive) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        meta: { username, reason: "Account inactive" },
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      throw new Error("\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A");
    }
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      await createAuditLog({
        userId: user.id,
        action: "LOGIN_FAILED",
        entity: "User",
        entityId: user.id,
        meta: { username, reason: "Invalid password" },
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      throw new Error("\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2B\u0E23\u0E37\u0E2D\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07");
    }
    const accessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId
    });
    const refreshToken = signRefreshToken({
      userId: user.id
    });
    await createAuditLog({
      userId: user.id,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
      meta: {
        username: user.username,
        role: user.role,
        department: user.department?.name ?? null
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      departmentId: user.departmentId,
      department: user.department
    };
    return {
      user: safeUser,
      accessToken,
      refreshToken
    };
  }
  static async refresh(refreshTokenString) {
    if (!refreshTokenString) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A Refresh Token \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    }
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshTokenString);
    } catch {
      throw new Error("Refresh Token \u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48");
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { id: true, name: true }
        }
      }
    });
    if (!user || !user.isActive) {
      throw new Error("\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E2B\u0E23\u0E37\u0E2D\u0E44\u0E21\u0E48\u0E21\u0E35\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A");
    }
    const newAccessToken = signAccessToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId
    });
    return {
      accessToken: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive,
        departmentId: user.departmentId,
        department: user.department
      }
    };
  }
  static async logout(userId, meta) {
    if (userId) {
      await createAuditLog({
        userId,
        action: "LOGOUT",
        entity: "User",
        entityId: userId,
        ip: meta?.ip,
        userAgent: meta?.userAgent
      });
    }
  }
  static async getMe(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19");
    }
    return user;
  }
};

// server/src/modules/auth/auth.controller.ts
var getClientMeta = (req) => ({
  ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]
});
var isCrossDomain = process.env.COOKIE_CROSS_DOMAIN === "true";
var COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production" || isCrossDomain,
  sameSite: isCrossDomain ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1e3,
  // 7 วัน
  path: "/"
};
var AuthController = class {
  static async login(req, res) {
    try {
      const meta = getClientMeta(req);
      const result = await AuthService.login(req.body, meta);
      res.cookie("refreshToken", result.refreshToken, COOKIE_OPTIONS);
      res.status(200).json({
        success: true,
        message: "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: {
          user: result.user,
          accessToken: result.accessToken
        }
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: error.message || "\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
      });
    }
  }
  static async refresh(req, res) {
    try {
      const refreshToken = req.cookies.refreshToken;
      if (!refreshToken) {
        res.status(401).json({
          success: false,
          code: "NO_REFRESH_TOKEN",
          message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A Refresh Token \u0E43\u0E19 Cookie \u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E43\u0E2B\u0E21\u0E48"
        });
        return;
      }
      const result = await AuthService.refresh(refreshToken);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
      res.status(401).json({
        success: false,
        code: "REFRESH_FAILED",
        message: error.message || "\u0E01\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E2D\u0E32\u0E22\u0E38 Token \u0E25\u0E49\u0E21\u0E40\u0E2B\u0E25\u0E27"
      });
    }
  }
  static async logout(req, res) {
    try {
      const meta = getClientMeta(req);
      await AuthService.logout(req.user?.id, meta);
      res.clearCookie("refreshToken", { ...COOKIE_OPTIONS, maxAge: 0 });
      res.status(200).json({
        success: true,
        message: "\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A"
      });
    }
  }
  static async me(req, res) {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19"
        });
        return;
      }
      const user = await AuthService.getMe(req.user.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49"
      });
    }
  }
};

// server/src/modules/auth/auth.schema.ts
import { z } from "zod";
var loginSchema = z.object({
  username: z.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" }).trim().min(3, "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 3 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  password: z.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19" }).min(6, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 6 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23")
});

// server/src/middlewares/validate.middleware.ts
import { ZodError } from "zod";
var validate = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }));
        res.status(400).json({
          success: false,
          message: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E2A\u0E48\u0E07\u0E21\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E15\u0E32\u0E21\u0E40\u0E07\u0E37\u0E48\u0E2D\u0E19\u0E44\u0E02 (Validation Error)",
          errors: issues
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"
      });
    }
  };
};

// server/src/middlewares/auth.middleware.ts
var authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23 (Missing or invalid authorization header)"
      });
      return;
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          code: "TOKEN_EXPIRED",
          message: "Access Token \u0E2B\u0E21\u0E14\u0E2D\u0E32\u0E22\u0E38 \u0E01\u0E23\u0E38\u0E13\u0E32 Refresh Token"
        });
        return;
      }
      res.status(401).json({
        success: false,
        code: "TOKEN_INVALID",
        message: "Access Token \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E23\u0E37\u0E2D\u0E16\u0E39\u0E01\u0E1B\u0E25\u0E2D\u0E21\u0E41\u0E1B\u0E25\u0E07"
      });
      return;
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { name: true }
        }
      }
    });
    if (!dbUser) {
      res.status(401).json({
        success: false,
        message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A"
      });
      return;
    }
    if (!dbUser.isActive) {
      res.status(403).json({
        success: false,
        message: "\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E19\u0E35\u0E49\u0E16\u0E39\u0E01\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E34\u0E14\u0E15\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A"
      });
      return;
    }
    req.user = {
      id: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      fullName: dbUser.fullName,
      role: dbUser.role,
      isActive: dbUser.isActive,
      departmentId: dbUser.departmentId,
      departmentName: dbUser.department?.name ?? null
    };
    next();
  } catch (error) {
    console.error("Authentication Error:", error);
    res.status(500).json({
      success: false,
      message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C"
    });
  }
};
var authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23"
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2B\u0E23\u0E37\u0E2D\u0E14\u0E33\u0E40\u0E19\u0E34\u0E19\u0E01\u0E32\u0E23\u0E43\u0E19\u0E2A\u0E48\u0E27\u0E19\u0E19\u0E35\u0E49 (Forbidden)"
      });
      return;
    }
    next();
  };
};
var optionalAuthenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }
    const token = authHeader.split(" ")[1];
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return next();
    }
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        department: {
          select: { name: true }
        }
      }
    });
    if (dbUser && dbUser.isActive) {
      req.user = {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role,
        isActive: dbUser.isActive,
        departmentId: dbUser.departmentId,
        departmentName: dbUser.department?.name ?? null
      };
    }
    return next();
  } catch {
    return next();
  }
};

// server/src/middlewares/rateLimit.middleware.ts
import rateLimit from "express-rate-limit";
var loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  // 15 นาที
  max: 10,
  // จำกัดไม่เกิน 10 ครั้งต่อ IP ใน 15 นาที
  standardHeaders: true,
  // ส่ง Draft-6 RateLimit-* headers
  legacyHeaders: false,
  // ปิด X-RateLimit-* headers
  message: {
    success: false,
    message: "\u0E21\u0E35\u0E01\u0E32\u0E23\u0E1E\u0E22\u0E32\u0E22\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E1A\u0E48\u0E2D\u0E22\u0E40\u0E01\u0E34\u0E19\u0E44\u0E1B \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E2D 15 \u0E19\u0E32\u0E17\u0E35\u0E41\u0E25\u0E49\u0E27\u0E25\u0E2D\u0E07\u0E43\u0E2B\u0E21\u0E48\u0E2D\u0E35\u0E01\u0E04\u0E23\u0E31\u0E49\u0E07"
  }
});

// server/src/modules/auth/auth.routes.ts
var router = Router();
router.post(
  "/login",
  loginRateLimiter,
  validate({ body: loginSchema }),
  AuthController.login
);
router.post("/refresh", AuthController.refresh);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.me);
var auth_routes_default = router;

// server/src/modules/department/department.routes.ts
import { Router as Router2 } from "express";

// server/src/modules/department/department.service.ts
var DepartmentService = class {
  static async getAll() {
    return prisma.department.findMany({
      include: {
        _count: {
          select: {
            users: true,
            forms: true
          }
        }
      },
      orderBy: {
        name: "asc"
      }
    });
  }
  static async getById(id) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            forms: true
          }
        }
      }
    });
    if (!department) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38");
    }
    return department;
  }
  static async create(input, actorId, meta) {
    const existing = await prisma.department.findUnique({
      where: { name: input.name }
    });
    if (existing) {
      throw new Error(`\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1C\u0E19\u0E01 "${input.name}" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27`);
    }
    const department = await prisma.department.create({
      data: {
        name: input.name
      }
    });
    await createAuditLog({
      userId: actorId,
      action: "DEPARTMENT_CREATE",
      entity: "Department",
      entityId: department.id,
      meta: {
        name: department.name
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return department;
  }
  static async update(id, input, actorId, meta) {
    const department = await prisma.department.findUnique({
      where: { id }
    });
    if (!department) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02");
    }
    const duplicate = await prisma.department.findFirst({
      where: {
        name: input.name,
        NOT: { id }
      }
    });
    if (duplicate) {
      throw new Error(`\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1C\u0E19\u0E01 "${input.name}" \u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E42\u0E14\u0E22\u0E41\u0E1C\u0E19\u0E01\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27`);
    }
    const previousName = department.name;
    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: input.name
      }
    });
    await createAuditLog({
      userId: actorId,
      action: "DEPARTMENT_UPDATE",
      entity: "Department",
      entityId: updated.id,
      meta: {
        before: { name: previousName },
        after: { name: updated.name }
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return updated;
  }
  static async delete(id, actorId, meta) {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            forms: true
          }
        }
      }
    });
    if (!department) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A");
    }
    if (department._count.users > 0) {
      throw new Error(
        `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E41\u0E1C\u0E19\u0E01 "${department.name}" \u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E22\u0E31\u0E07\u0E21\u0E35\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2A\u0E31\u0E07\u0E01\u0E31\u0E14\u0E2D\u0E22\u0E39\u0E48 ${department._count.users} \u0E04\u0E19 (\u0E01\u0E23\u0E38\u0E13\u0E32\u0E22\u0E49\u0E32\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E44\u0E1B\u0E41\u0E1C\u0E19\u0E01\u0E2D\u0E37\u0E48\u0E19\u0E01\u0E48\u0E2D\u0E19)`
      );
    }
    if (department._count.forms > 0) {
      throw new Error(
        `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E41\u0E1C\u0E19\u0E01 "${department.name}" \u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E21\u0E35\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E02\u0E2D\u0E07\u0E41\u0E1C\u0E19\u0E01\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48 ${department._count.forms} \u0E1F\u0E2D\u0E23\u0E4C\u0E21`
      );
    }
    await prisma.department.delete({
      where: { id }
    });
    await createAuditLog({
      userId: actorId,
      action: "DEPARTMENT_DELETE",
      entity: "Department",
      entityId: id,
      meta: {
        name: department.name
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return { id, name: department.name };
  }
};

// server/src/modules/department/department.controller.ts
var getClientMeta2 = (req) => ({
  ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]
});
var DepartmentController = class {
  static async getAll(_req, res) {
    try {
      const departments = await DepartmentService.getAll();
      res.status(200).json({
        success: true,
        data: departments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E01"
      });
    }
  }
  static async getById(req, res) {
    try {
      const department = await DepartmentService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: department
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E41\u0E1C\u0E19\u0E01"
      });
    }
  }
  static async create(req, res) {
    try {
      const meta = getClientMeta2(req);
      const actorId = req.user.id;
      const department = await DepartmentService.create(req.body, actorId, meta);
      res.status(201).json({
        success: true,
        message: "\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E01\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: department
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1C\u0E19\u0E01\u0E44\u0E14\u0E49"
      });
    }
  }
  static async update(req, res) {
    try {
      const meta = getClientMeta2(req);
      const actorId = req.user.id;
      const department = await DepartmentService.update(req.params.id, req.body, actorId, meta);
      res.status(200).json({
        success: true,
        message: "\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E1C\u0E19\u0E01\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: department
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E1C\u0E19\u0E01\u0E44\u0E14\u0E49"
      });
    }
  }
  static async delete(req, res) {
    try {
      const meta = getClientMeta2(req);
      const actorId = req.user.id;
      const result = await DepartmentService.delete(req.params.id, actorId, meta);
      res.status(200).json({
        success: true,
        message: `\u0E25\u0E1A\u0E41\u0E1C\u0E19\u0E01 "${result.name}" \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E41\u0E1C\u0E19\u0E01\u0E44\u0E14\u0E49"
      });
    }
  }
};

// server/src/modules/department/department.schema.ts
import { z as z2 } from "zod";
var createDepartmentSchema = z2.object({
  name: z2.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1C\u0E19\u0E01" }).trim().min(2, "\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1C\u0E19\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 2 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(100, "\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1C\u0E19\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23")
});
var updateDepartmentSchema = createDepartmentSchema;

// server/src/modules/department/department.routes.ts
var router2 = Router2();
router2.use(authenticate, authorize("ADMIN"));
router2.get("/", DepartmentController.getAll);
router2.get("/:id", DepartmentController.getById);
router2.post("/", validate({ body: createDepartmentSchema }), DepartmentController.create);
router2.put("/:id", validate({ body: updateDepartmentSchema }), DepartmentController.update);
router2.delete("/:id", DepartmentController.delete);
var department_routes_default = router2;

// server/src/modules/user/user.routes.ts
import { Router as Router3 } from "express";

// server/src/modules/user/user.service.ts
import bcrypt2 from "bcryptjs";
import { Role } from "@prisma/client";
var UserService = class {
  /**
   * ค้นหาผู้ใช้สำหรับแชร์ฟอร์ม หรือ Assign งาน (เฉพาะผู้ใช้งานที่ Active)
   */
  static async lookup(search) {
    const where = { isActive: true };
    if (search) {
      where.OR = [
        { username: { contains: search, mode: "insensitive" } },
        { fullName: { contains: search, mode: "insensitive" } }
      ];
    }
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        fullName: true,
        department: { select: { id: true, name: true } }
      },
      take: 50,
      orderBy: { fullName: "asc" }
    });
  }
  static async getAll(filters) {
    const where = {};
    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search, mode: "insensitive" } },
        { fullName: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } }
      ];
    }
    if (filters.departmentId) {
      where.departmentId = filters.departmentId;
    }
    if (filters.role) {
      where.role = filters.role;
    }
    if (filters.isActive !== void 0) {
      where.isActive = filters.isActive;
    }
    return prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            forms: true,
            submissions: true
          }
        },
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { role: "asc" },
        // ADMIN มาก่อน
        { fullName: "asc" }
      ]
    });
  }
  static async getById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true
          }
        },
        createdAt: true,
        updatedAt: true
      }
    });
    if (!user) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19");
    }
    return user;
  }
  static async create(input, actorId, meta) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username }
    });
    if (existingUsername) {
      throw new Error(`\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 "${input.username}" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27`);
    }
    const existingEmail = await prisma.user.findUnique({
      where: { email: input.email }
    });
    if (existingEmail) {
      throw new Error(`\u0E2D\u0E35\u0E40\u0E21\u0E25 "${input.email}" \u0E21\u0E35\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27`);
    }
    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId }
      });
      if (!deptExists) {
        throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A");
      }
    }
    const passwordHash = await bcrypt2.hash(input.password, 10);
    const user = await prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        departmentId: input.departmentId || null,
        isActive: input.isActive ?? true
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: {
          select: { id: true, name: true }
        },
        createdAt: true
      }
    });
    await createAuditLog({
      userId: actorId,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      meta: {
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        department: user.department?.name ?? null
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return user;
  }
  static async update(id, input, actorId, meta) {
    const user = await prisma.user.findUnique({
      where: { id }
    });
    if (!user) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E01\u0E49\u0E44\u0E02");
    }
    if (actorId === id && input.isActive === false) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
    }
    if (actorId === id && input.role !== Role.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E14\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
    }
    const duplicateEmail = await prisma.user.findFirst({
      where: {
        email: input.email,
        NOT: { id }
      }
    });
    if (duplicateEmail) {
      throw new Error(`\u0E2D\u0E35\u0E40\u0E21\u0E25 "${input.email}" \u0E16\u0E39\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E42\u0E14\u0E22\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E2D\u0E37\u0E48\u0E19\u0E41\u0E25\u0E49\u0E27`);
    }
    if (input.departmentId) {
      const deptExists = await prisma.department.findUnique({
        where: { id: input.departmentId }
      });
      if (!deptExists) {
        throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1C\u0E19\u0E01\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38\u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A");
      }
    }
    const previousData = {
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId,
      isActive: user.isActive
    };
    const updated = await prisma.user.update({
      where: { id },
      data: {
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        departmentId: input.departmentId || null,
        isActive: input.isActive
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
        updatedAt: true
      }
    });
    await createAuditLog({
      userId: actorId,
      action: "USER_UPDATE",
      entity: "User",
      entityId: updated.id,
      meta: {
        before: previousData,
        after: {
          email: updated.email,
          fullName: updated.fullName,
          role: updated.role,
          departmentId: updated.departmentId,
          isActive: updated.isActive
        }
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return updated;
  }
  static async toggleStatus(id, isActive, actorId, meta) {
    if (actorId === id && !isActive) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
    }
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19");
    const updated = await prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        isActive: true
      }
    });
    await createAuditLog({
      userId: actorId,
      action: "USER_STATUS_TOGGLE",
      entity: "User",
      entityId: id,
      meta: {
        username: updated.username,
        isActive: updated.isActive
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return updated;
  }
  static async resetPassword(id, input, actorId, meta) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19");
    const passwordHash = await bcrypt2.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id },
      data: { passwordHash }
    });
    await createAuditLog({
      userId: actorId,
      action: "USER_PASSWORD_RESET",
      entity: "User",
      entityId: id,
      meta: {
        username: user.username
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return { id, username: user.username };
  }
  static async delete(id, actorId, meta) {
    if (actorId === id) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E02\u0E2D\u0E07\u0E15\u0E19\u0E40\u0E2D\u0E07\u0E44\u0E14\u0E49");
    }
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            forms: true,
            submissions: true
          }
        }
      }
    });
    if (!user) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E25\u0E1A");
    }
    if (user._count.forms > 0 || user._count.submissions > 0) {
      await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });
      await createAuditLog({
        userId: actorId,
        action: "USER_DEACTIVATE_INSTEAD_OF_DELETE",
        entity: "User",
        entityId: id,
        meta: {
          username: user.username,
          formsCount: user._count.forms,
          submissionsCount: user._count.submissions,
          reason: "User has historical data; deactivated instead of hard-delete"
        },
        ip: meta.ip,
        userAgent: meta.userAgent
      });
      return {
        action: "deactivated",
        message: `\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 "${user.username}" \u0E21\u0E35\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1F\u0E2D\u0E23\u0E4C\u0E21 (${user._count.forms}) \u0E2B\u0E23\u0E37\u0E2D\u0E2A\u0E48\u0E07\u0E1C\u0E25\u0E2A\u0E2D\u0E1A (${user._count.submissions}) \u0E43\u0E19\u0E23\u0E30\u0E1A\u0E1A\u0E41\u0E25\u0E49\u0E27 \u0E23\u0E30\u0E1A\u0E1A\u0E08\u0E36\u0E07\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E40\u0E1B\u0E47\u0E19 "\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" \u0E41\u0E17\u0E19\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E23\u0E31\u0E01\u0E29\u0E32\u0E1B\u0E23\u0E30\u0E27\u0E31\u0E15\u0E34\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25`
      };
    }
    await prisma.user.delete({ where: { id } });
    await createAuditLog({
      userId: actorId,
      action: "USER_DELETE",
      entity: "User",
      entityId: id,
      meta: { username: user.username },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      action: "deleted",
      message: `\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 "${user.username}" \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`
    };
  }
};

// server/src/modules/user/user.controller.ts
var getClientMeta3 = (req) => ({
  ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]
});
var UserController = class {
  static async lookup(req, res) {
    try {
      const search = req.query.search ? String(req.query.search).trim() : void 0;
      const users = await UserService.lookup(search);
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E04\u0E49\u0E19\u0E2B\u0E32\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
  static async getAll(req, res) {
    try {
      const { search, departmentId, role, isActive } = req.query;
      const filters = {
        search: search ? String(search).trim() : void 0,
        departmentId: departmentId ? String(departmentId) : void 0,
        role: role ? String(role) : void 0,
        isActive: isActive !== void 0 ? isActive === "true" : void 0
      };
      const users = await UserService.getAll(filters);
      res.status(200).json({
        success: true,
        data: users
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
      });
    }
  }
  static async getById(req, res) {
    try {
      const user = await UserService.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
      });
    }
  }
  static async create(req, res) {
    try {
      const meta = getClientMeta3(req);
      const actorId = req.user.id;
      const user = await UserService.create(req.body, actorId, meta);
      res.status(201).json({
        success: true,
        message: `\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 "${user.username}" \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
  static async update(req, res) {
    try {
      const meta = getClientMeta3(req);
      const actorId = req.user.id;
      const user = await UserService.update(req.params.id, req.body, actorId, meta);
      res.status(200).json({
        success: true,
        message: `\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19 "${user.username}" \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E41\u0E01\u0E49\u0E44\u0E02\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
  static async toggleStatus(req, res) {
    try {
      const meta = getClientMeta3(req);
      const actorId = req.user.id;
      const { isActive } = req.body;
      const user = await UserService.toggleStatus(req.params.id, Boolean(isActive), actorId, meta);
      res.status(200).json({
        success: true,
        message: `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 "${user.username}" \u0E40\u0E1B\u0E47\u0E19 ${user.isActive ? "\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" : "\u0E23\u0E30\u0E07\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"} \u0E41\u0E25\u0E49\u0E27`,
        data: user
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
  static async resetPassword(req, res) {
    try {
      const meta = getClientMeta3(req);
      const actorId = req.user.id;
      const result = await UserService.resetPassword(req.params.id, req.body, actorId, meta);
      res.status(200).json({
        success: true,
        message: `\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A "${result.username}" \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E23\u0E35\u0E40\u0E0B\u0E47\u0E15\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
  static async delete(req, res) {
    try {
      const meta = getClientMeta3(req);
      const actorId = req.user.id;
      const result = await UserService.delete(req.params.id, actorId, meta);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E44\u0E14\u0E49"
      });
    }
  }
};

// server/src/modules/user/user.schema.ts
import { z as z3 } from "zod";
import { Role as Role2 } from "@prisma/client";
var createUserSchema = z3.object({
  username: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" }).trim().min(3, "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 3 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(50, "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 50 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").regex(/^[a-zA-Z0-9_.-]+$/, "\u0E0A\u0E37\u0E48\u0E2D\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E43\u0E0A\u0E49\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E20\u0E32\u0E29\u0E32\u0E2D\u0E31\u0E07\u0E01\u0E24\u0E29 \u0E15\u0E31\u0E27\u0E40\u0E25\u0E02, \u0E08\u0E38\u0E14, \u0E02\u0E35\u0E14\u0E25\u0E48\u0E32\u0E07 \u0E2B\u0E23\u0E37\u0E2D\u0E02\u0E35\u0E14\u0E01\u0E25\u0E32\u0E07\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19"),
  email: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E35\u0E40\u0E21\u0E25" }).trim().email("\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
  password: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19" }).min(6, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 6 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  fullName: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25" }).trim().min(2, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 2 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(100, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  role: z3.nativeEnum(Role2, { errorMap: () => ({ message: "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 ADMIN \u0E2B\u0E23\u0E37\u0E2D USER" }) }),
  departmentId: z3.string().nullable().optional(),
  isActive: z3.boolean().optional().default(true)
});
var updateUserSchema = z3.object({
  email: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E2D\u0E35\u0E40\u0E21\u0E25" }).trim().email("\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E2D\u0E35\u0E40\u0E21\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07"),
  fullName: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25" }).trim().min(2, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 2 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(100, "\u0E0A\u0E37\u0E48\u0E2D-\u0E19\u0E32\u0E21\u0E2A\u0E01\u0E38\u0E25\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 100 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  role: z3.nativeEnum(Role2, { errorMap: () => ({ message: "\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19 ADMIN \u0E2B\u0E23\u0E37\u0E2D USER" }) }),
  departmentId: z3.string().nullable().optional(),
  isActive: z3.boolean()
});
var resetPasswordSchema = z3.object({
  newPassword: z3.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48" }).min(6, "\u0E23\u0E2B\u0E31\u0E2A\u0E1C\u0E48\u0E32\u0E19\u0E43\u0E2B\u0E21\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 6 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23")
});
var toggleUserStatusSchema = z3.object({
  isActive: z3.boolean({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E01\u0E32\u0E23\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19" })
});

// server/src/modules/user/user.routes.ts
var router3 = Router3();
router3.use(authenticate);
router3.get("/lookup", UserController.lookup);
router3.use(authorize("ADMIN"));
router3.get("/", UserController.getAll);
router3.get("/:id", UserController.getById);
router3.post("/", validate({ body: createUserSchema }), UserController.create);
router3.put("/:id", validate({ body: updateUserSchema }), UserController.update);
router3.patch("/:id/status", validate({ body: toggleUserStatusSchema }), UserController.toggleStatus);
router3.patch("/:id/reset-password", validate({ body: resetPasswordSchema }), UserController.resetPassword);
router3.delete("/:id", UserController.delete);
var user_routes_default = router3;

// server/src/modules/form/form.routes.ts
import { Router as Router4 } from "express";

// server/src/modules/form/form.controller.ts
import { Role as Role4 } from "@prisma/client";

// server/src/modules/form/form.service.ts
import { Role as Role3, FormStatus, FormVisibility, FormType, Prisma as Prisma2 } from "@prisma/client";
var FormService = class {
  /**
   * ดึงรายการฟอร์มที่ผู้ใช้มีสิทธิ์เข้าถึง (สำหรับหน้าจัดการฟอร์ม หรือ ถังขยะ)
   */
  static async getForms(userId, userRole, userDeptId, isTrash = false) {
    const where = {};
    if (isTrash) {
      where.deletedAt = { not: null };
      if (userRole !== Role3.ADMIN) {
        where.ownerId = userId;
      }
    } else {
      where.deletedAt = null;
      if (userRole !== Role3.ADMIN) {
        where.OR = [
          { ownerId: userId },
          { visibility: FormVisibility.PUBLIC },
          ...userDeptId ? [
            {
              visibility: FormVisibility.DEPARTMENT,
              departmentId: userDeptId
            }
          ] : [],
          {
            visibility: FormVisibility.PRIVATE,
            shares: {
              some: { userId }
            }
          }
        ];
      }
    }
    const forms = await prisma.form.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            username: true
          }
        },
        department: {
          select: {
            id: true,
            name: true
          }
        },
        versions: {
          orderBy: { version: "desc" },
          take: 1,
          select: {
            id: true,
            version: true,
            _count: {
              select: { submissions: true }
            }
          }
        },
        _count: {
          select: {
            shares: true,
            assignments: true
          }
        }
      },
      orderBy: isTrash ? { deletedAt: "desc" } : { updatedAt: "desc" }
    });
    return forms.map((f) => {
      const latestVersion = f.versions[0] || null;
      return {
        ...f,
        latestVersionNumber: latestVersion?.version ?? 1,
        latestVersionId: latestVersion?.id ?? null,
        submissionsCount: latestVersion?._count.submissions ?? 0,
        isOwner: f.ownerId === userId || userRole === Role3.ADMIN
      };
    });
  }
  /**
   * ดึงรายการฟอร์มที่อยู่ในถังขยะ
   */
  static async getTrash(userId, userRole) {
    return this.getForms(userId, userRole, null, true);
  }
  /**
   * ดึงจำนวนแบบฟอร์มในถังขยะ
   */
  static async getTrashCount(userId, userRole) {
    const where = {
      deletedAt: { not: null },
      ...userRole !== Role3.ADMIN ? { ownerId: userId } : {}
    };
    return prisma.form.count({ where });
  }
  /**
   * ดึงฟอร์มตาม ID (พร้อมตรวจสอบสิทธิ์การเข้าถึง)
   */
  static async getById(formId, userId, userRole, userDeptId, forEditing = false) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        owner: {
          select: { id: true, fullName: true, username: true }
        },
        department: {
          select: { id: true, name: true }
        },
        shares: {
          include: {
            user: { select: { id: true, fullName: true, username: true } }
          }
        },
        versions: {
          orderBy: { version: "desc" }
        }
      }
    });
    if (!form) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38");
    }
    if (form.deletedAt) {
      throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E39\u0E49\u0E04\u0E37\u0E19\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1B\u0E34\u0E14\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19");
    }
    const isOwner = userId ? form.ownerId === userId || userRole === Role3.ADMIN : false;
    if (forEditing && !isOwner) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49 (\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A)");
    }
    if (!isOwner) {
      if (form.requireLogin && !userId) {
        throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E2D\u0E1A (Authentication Required)");
      }
      if (form.visibility === FormVisibility.PRIVATE) {
        if (!userId) {
          throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25 (Private) \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19");
        }
        const isShared = form.shares.some((s) => s.userId === userId);
        if (!isShared) {
          throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25 (Private) \u0E41\u0E25\u0E30\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E41\u0E0A\u0E23\u0E4C\u0E43\u0E2B\u0E49\u0E04\u0E38\u0E13");
        }
      } else if (form.visibility === FormVisibility.DEPARTMENT) {
        if (!userId || !userDeptId || form.departmentId !== userDeptId) {
          throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E2A\u0E07\u0E27\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19");
        }
      }
    }
    const latestVersion = form.versions[0];
    let schema = latestVersion?.schema || [];
    if (!isOwner) {
      schema = schema.map((field) => {
        const { correctAnswer, ...safeField } = field;
        return safeField;
      });
    }
    return {
      ...form,
      schema,
      scoreConfig: latestVersion?.scoreConfig || null,
      currentVersionNumber: latestVersion?.version || 1,
      currentVersionId: latestVersion?.id || null,
      isOwner
    };
  }
  /**
   * สร้างแบบฟอร์มใหม่
   */
  static async create(input, ownerId, meta) {
    const form = await prisma.form.create({
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        visibility: input.visibility,
        departmentId: input.departmentId || null,
        ownerId,
        status: FormStatus.DRAFT,
        isAcceptingResponses: input.isAcceptingResponses ?? true,
        requireLogin: input.requireLogin ?? true,
        pdpaEnabled: input.pdpaEnabled ?? false,
        pdpaTitle: input.pdpaTitle || null,
        pdpaContent: input.pdpaContent || null,
        openAt: input.openAt ? new Date(input.openAt) : null,
        closeAt: input.closeAt ? new Date(input.closeAt) : null,
        allowMultiple: input.allowMultiple ?? true,
        maxAttempts: input.maxAttempts || null,
        versions: {
          create: {
            version: 1,
            schema: input.schema,
            scoreConfig: input.scoreConfig || Prisma2.JsonNull
          }
        }
      },
      include: {
        versions: true
      }
    });
    await createAuditLog({
      userId: ownerId,
      action: "FORM_CREATE",
      entity: "Form",
      entityId: form.id,
      meta: {
        title: form.title,
        type: form.type,
        visibility: form.visibility
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return form;
  }
  /**
   * อัปเดตแบบฟอร์ม (บันทึกร่าง)
   */
  static async update(formId, input, userId, userRole, meta) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49");
    }
    const latestVersion = form.versions[0];
    const updatedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        visibility: input.visibility,
        departmentId: input.departmentId !== void 0 ? input.departmentId : form.departmentId,
        requireLogin: input.requireLogin !== void 0 ? input.requireLogin : form.requireLogin,
        pdpaEnabled: input.pdpaEnabled !== void 0 ? input.pdpaEnabled : form.pdpaEnabled,
        pdpaTitle: input.pdpaTitle !== void 0 ? input.pdpaTitle : form.pdpaTitle,
        pdpaContent: input.pdpaContent !== void 0 ? input.pdpaContent : form.pdpaContent
      }
    });
    if (latestVersion && input.schema) {
      await prisma.formVersion.update({
        where: { id: latestVersion.id },
        data: {
          schema: input.schema,
          scoreConfig: input.scoreConfig || latestVersion.scoreConfig || Prisma2.JsonNull
        }
      });
    }
    await createAuditLog({
      userId,
      action: "FORM_UPDATE",
      entity: "Form",
      entityId: formId,
      meta: { title: updatedForm.title },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return updatedForm;
  }
  /**
   * เผยแพร่แบบฟอร์ม (Publish Form) พร้อมระบบ Versioning
   */
  static async publish(formId, input, userId, userRole, meta) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        versions: {
          orderBy: { version: "desc" },
          include: {
            _count: { select: { submissions: true } }
          }
        }
      }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49");
    }
    const latestVersion = form.versions[0];
    let newVersionNumber = 1;
    if (latestVersion) {
      if (form.status === FormStatus.DRAFT && latestVersion._count.submissions === 0) {
        await prisma.formVersion.update({
          where: { id: latestVersion.id },
          data: {
            schema: input.schema,
            scoreConfig: input.scoreConfig || Prisma2.JsonNull
          }
        });
        newVersionNumber = latestVersion.version;
      } else {
        newVersionNumber = latestVersion.version + 1;
        await prisma.formVersion.create({
          data: {
            formId: form.id,
            version: newVersionNumber,
            schema: input.schema,
            scoreConfig: input.scoreConfig || Prisma2.JsonNull
          }
        });
      }
    }
    const publishedForm = await prisma.form.update({
      where: { id: formId },
      data: {
        status: FormStatus.PUBLISHED,
        isAcceptingResponses: true
      }
    });
    await createAuditLog({
      userId,
      action: "FORM_PUBLISH",
      entity: "Form",
      entityId: formId,
      meta: {
        title: publishedForm.title,
        version: newVersionNumber
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      form: publishedForm,
      version: newVersionNumber
    };
  }
  /**
   * ปรับตั้งค่าฟอร์ม (เปิด-ปิดรับคำตอบ, ช่วงเวลา, ครั้งที่ทำได้)
   */
  static async updateSettings(formId, input, userId, userRole, meta) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E01\u0E49\u0E44\u0E02\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49");
    }
    const updated = await prisma.form.update({
      where: { id: formId },
      data: {
        isAcceptingResponses: input.isAcceptingResponses !== void 0 ? input.isAcceptingResponses : form.isAcceptingResponses,
        openAt: input.openAt !== void 0 ? input.openAt ? new Date(input.openAt) : null : form.openAt,
        closeAt: input.closeAt !== void 0 ? input.closeAt ? new Date(input.closeAt) : null : form.closeAt,
        allowMultiple: input.allowMultiple !== void 0 ? input.allowMultiple : form.allowMultiple,
        maxAttempts: input.maxAttempts !== void 0 ? input.maxAttempts : form.maxAttempts,
        visibility: input.visibility !== void 0 ? input.visibility : form.visibility,
        departmentId: input.departmentId !== void 0 ? input.departmentId : form.departmentId,
        requireLogin: input.requireLogin !== void 0 ? input.requireLogin : form.requireLogin,
        pdpaEnabled: input.pdpaEnabled !== void 0 ? input.pdpaEnabled : form.pdpaEnabled,
        pdpaTitle: input.pdpaTitle !== void 0 ? input.pdpaTitle : form.pdpaTitle,
        pdpaContent: input.pdpaContent !== void 0 ? input.pdpaContent : form.pdpaContent
      }
    });
    await createAuditLog({
      userId,
      action: "FORM_SETTINGS_UPDATE",
      entity: "Form",
      entityId: formId,
      meta: {
        isAcceptingResponses: updated.isAcceptingResponses,
        openAt: updated.openAt,
        closeAt: updated.closeAt,
        allowMultiple: updated.allowMultiple
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return updated;
  }
  /**
   * แชร์ฟอร์มส่วนบุคคล (FormShare)
   */
  static async shareForm(formId, targetUserIds, userId, userRole, meta) {
    const form = await prisma.form.findUnique({ where: { id: formId } });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E41\u0E0A\u0E23\u0E4C\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49");
    }
    await prisma.$transaction([
      prisma.formShare.deleteMany({ where: { formId } }),
      prisma.formShare.createMany({
        data: targetUserIds.map((uId) => ({
          formId,
          userId: uId
        })),
        skipDuplicates: true
      })
    ]);
    await createAuditLog({
      userId,
      action: "FORM_SHARE",
      entity: "Form",
      entityId: formId,
      meta: {
        sharedUserCount: targetUserIds.length
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return { success: true, count: targetUserIds.length };
  }
  /**
   * ย้ายแบบฟอร์มไปไว้ในถังขยะ (Soft Delete)
   */
  static async moveToTrash(formId, userId, userRole, meta) {
    const form = await prisma.form.findUnique({
      where: { id: formId }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E22\u0E49\u0E32\u0E22\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E44\u0E1B\u0E17\u0E35\u0E48\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30");
    }
    if (form.deletedAt) {
      return {
        action: "trashed",
        message: `\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30\u0E2D\u0E22\u0E39\u0E48\u0E41\u0E25\u0E49\u0E27`
      };
    }
    await prisma.form.update({
      where: { id: formId },
      data: {
        deletedAt: /* @__PURE__ */ new Date(),
        isAcceptingResponses: false
      }
    });
    await createAuditLog({
      userId,
      action: "FORM_MOVE_TO_TRASH",
      entity: "Form",
      entityId: formId,
      meta: { title: form.title },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      action: "trashed",
      message: `\u0E22\u0E49\u0E32\u0E22\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E44\u0E1B\u0E44\u0E27\u0E49\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`
    };
  }
  /**
   * กู้คืนแบบฟอร์มจากถังขยะ (Restore Form)
   */
  static async restore(formId, userId, userRole, meta) {
    const form = await prisma.form.findUnique({
      where: { id: formId }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E01\u0E39\u0E49\u0E04\u0E37\u0E19\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49");
    }
    if (!form.deletedAt) {
      return {
        action: "active",
        message: `\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30`
      };
    }
    await prisma.form.update({
      where: { id: formId },
      data: {
        deletedAt: null
      }
    });
    await createAuditLog({
      userId,
      action: "FORM_RESTORE",
      entity: "Form",
      entityId: formId,
      meta: { title: form.title },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      action: "restored",
      message: `\u0E01\u0E39\u0E49\u0E04\u0E37\u0E19\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E01\u0E25\u0E31\u0E1A\u0E21\u0E32\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`
    };
  }
  /**
   * ลบแบบฟอร์มอย่างถาวร (Permanent Hard Delete)
   */
  static async deletePermanently(formId, userId, userRole, meta) {
    const form = await prisma.form.findUnique({
      where: { id: formId }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E25\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23");
    }
    await prisma.form.delete({
      where: { id: formId }
    });
    await createAuditLog({
      userId,
      action: "FORM_PERMANENT_DELETE",
      entity: "Form",
      entityId: formId,
      meta: { title: form.title },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      action: "deleted_permanently",
      message: `\u0E25\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E2D\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E23\u0E30\u0E1A\u0E1A\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23\u0E41\u0E25\u0E49\u0E27`
    };
  }
  /**
   * ล้างถังขยะทั้งหมด (Empty Trash)
   */
  static async emptyTrash(userId, userRole, meta) {
    const where = {
      deletedAt: { not: null },
      ...userRole !== Role3.ADMIN ? { ownerId: userId } : {}
    };
    const count = await prisma.form.count({ where });
    if (count === 0) {
      return { count: 0, message: "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30" };
    }
    await prisma.form.deleteMany({ where });
    await createAuditLog({
      userId,
      action: "FORM_EMPTY_TRASH",
      entity: "Form",
      meta: { deletedCount: count },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    return {
      count,
      message: `\u0E25\u0E49\u0E32\u0E07\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27 \u0E25\u0E1A\u0E17\u0E31\u0E49\u0E07\u0E2B\u0E21\u0E14 ${count} \u0E23\u0E32\u0E22\u0E01\u0E32\u0E23`
    };
  }
  /**
   * ลบหรือระงับแบบฟอร์ม (ส่งไปถังขยะ)
   */
  static async delete(formId, userId, userRole, meta) {
    return this.moveToTrash(formId, userId, userRole, meta);
  }
  /**
   * ส่งคำตอบแบบฟอร์ม (Form Submission) พร้อมคำนวณคะแนนอัตโนมัติที่ Backend
   */
  static async submit(formId, answers, userId, userRole, userDeptId, meta, pdpaConsent = false) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        shares: true,
        versions: {
          orderBy: { version: "desc" },
          take: 1
        }
      }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E17\u0E35\u0E48\u0E23\u0E30\u0E1A\u0E38");
    if (form.deletedAt) {
      throw new Error("\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E44\u0E14\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30");
    }
    if (form.status !== FormStatus.PUBLISHED) {
      throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48 \u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E44\u0E14\u0E49");
    }
    if (!form.isAcceptingResponses) {
      throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27");
    }
    const now = /* @__PURE__ */ new Date();
    if (form.openAt && now < form.openAt) {
      throw new Error(`\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E08\u0E30\u0E40\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E43\u0E19\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${form.openAt.toLocaleString("th-TH")}`);
    }
    if (form.closeAt && now > form.closeAt) {
      throw new Error(`\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E1B\u0E34\u0E14\u0E23\u0E31\u0E1A\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E41\u0E25\u0E49\u0E27\u0E40\u0E21\u0E37\u0E48\u0E2D\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48 ${form.closeAt.toLocaleString("th-TH")}`);
    }
    const isOwner = userId ? form.ownerId === userId || userRole === Role3.ADMIN : false;
    if (!isOwner) {
      if (form.requireLogin && !userId) {
        throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19\u0E15\u0E2D\u0E1A (Authentication Required)");
      }
      if (form.visibility === FormVisibility.PRIVATE) {
        if (!userId) {
          throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E40\u0E1B\u0E47\u0E19\u0E41\u0E1A\u0E1A\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25 (Private) \u0E01\u0E33\u0E2B\u0E19\u0E14\u0E43\u0E2B\u0E49\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E01\u0E48\u0E2D\u0E19");
        }
        const isShared = form.shares.some((s) => s.userId === userId);
        if (!isShared) {
          throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E43\u0E19\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E48\u0E27\u0E19\u0E1A\u0E38\u0E04\u0E04\u0E25\u0E19\u0E35\u0E49");
        }
      } else if (form.visibility === FormVisibility.DEPARTMENT) {
        if (!userId || !userDeptId || form.departmentId !== userDeptId) {
          throw new Error("\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E2A\u0E07\u0E27\u0E19\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E2A\u0E21\u0E32\u0E0A\u0E34\u0E01\u0E43\u0E19\u0E41\u0E1C\u0E19\u0E01\u0E40\u0E17\u0E48\u0E32\u0E19\u0E31\u0E49\u0E19");
        }
      }
    }
    if (userId) {
      const previousSubmissionsCount = await prisma.submission.count({
        where: {
          userId,
          formVersion: { formId }
        }
      });
      if (!form.allowMultiple && previousSubmissionsCount >= 1) {
        throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E14\u0E49\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E41\u0E25\u0E49\u0E27 \u0E41\u0E25\u0E30\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E44\u0E21\u0E48\u0E2D\u0E19\u0E38\u0E0D\u0E32\u0E15\u0E43\u0E2B\u0E49\u0E17\u0E33\u0E0B\u0E49\u0E33");
      }
      if (form.maxAttempts && previousSubmissionsCount >= form.maxAttempts) {
        throw new Error(`\u0E04\u0E38\u0E13\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E04\u0E23\u0E1A\u0E08\u0E33\u0E19\u0E27\u0E19\u0E04\u0E23\u0E31\u0E49\u0E07\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E41\u0E25\u0E49\u0E27 (${form.maxAttempts} \u0E04\u0E23\u0E31\u0E49\u0E07)`);
      }
    }
    const latestVersion = form.versions[0];
    if (!latestVersion) {
      throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19\u0E02\u0E2D\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    }
    const schema = latestVersion.schema || [];
    const scoreConfig = latestVersion.scoreConfig || null;
    for (const field of schema) {
      if (field.type === "layer_box") continue;
      if (field.required) {
        const val = answers[field.id];
        if (val === void 0 || val === null || val === "" || Array.isArray(val) && val.length === 0) {
          throw new Error(`\u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E2D\u0E1A\u0E04\u0E33\u0E16\u0E32\u0E21\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E17\u0E35\u0E48\u0E08\u0E33\u0E40\u0E1B\u0E47\u0E19: "${field.label}"`);
        }
      }
    }
    const isScoreTest = form.type === FormType.SCORE_TEST;
    let totalScore = null;
    let maxScore = null;
    let passed = null;
    let grade = null;
    const flaggedFieldIds = [];
    if (isScoreTest) {
      let earned = 0;
      let totalPoints = 0;
      for (const field of schema) {
        if (field.type === "layer_box") continue;
        const points = field.points ?? 0;
        if (points > 0) {
          totalPoints += points;
          const userAns = answers[field.id];
          const correctAns = field.correctAnswer;
          if (correctAns !== void 0 && correctAns !== null && userAns !== void 0 && userAns !== null) {
            let isCorrect = false;
            if (field.type === "number") {
              isCorrect = Number(userAns) === Number(correctAns);
            } else if (field.type === "text") {
              isCorrect = String(userAns).trim().toLowerCase() === String(correctAns).trim().toLowerCase();
            } else if (field.type === "single_choice" || field.type === "dropdown") {
              const optList = field.options || [];
              const userOpt = optList.find((o) => o.id === userAns || o.label === userAns);
              const userLabel = userOpt ? userOpt.label : String(userAns);
              const userId2 = userOpt ? userOpt.id : String(userAns);
              const correctOpt = optList.find((o) => o.id === correctAns || o.label === correctAns);
              const correctLabel = correctOpt ? correctOpt.label : String(correctAns);
              const correctId = correctOpt ? correctOpt.id : String(correctAns);
              isCorrect = String(userAns) === String(correctAns) || userLabel === correctLabel || userId2 === correctId;
            } else if (field.type === "multi_choice") {
              if (Array.isArray(userAns) && Array.isArray(correctAns)) {
                const optList = field.options || [];
                const normalizeVal = (val) => {
                  const opt = optList.find((o) => o.id === val || o.label === val);
                  return opt ? opt.label : val;
                };
                const sortedUser = [...userAns].map(normalizeVal).sort();
                const sortedCorrect = [...correctAns].map(normalizeVal).sort();
                isCorrect = sortedUser.length === sortedCorrect.length && sortedUser.every((v, i) => v === sortedCorrect[i]);
              }
            } else if (field.type === "rating") {
              isCorrect = Number(userAns) === Number(correctAns);
            } else if (field.type === "date") {
              isCorrect = String(userAns).trim() === String(correctAns).trim();
            }
            if (isCorrect) {
              earned += points;
              flaggedFieldIds.push(field.id);
            }
          }
        }
      }
      totalScore = earned;
      maxScore = totalPoints;
      const percentage = maxScore > 0 ? totalScore / maxScore * 100 : 100;
      const passThreshold = scoreConfig?.passScore ?? 50;
      passed = percentage >= passThreshold;
      if (scoreConfig?.gradeBands && scoreConfig.gradeBands.length > 0) {
        const sortedBands = [...scoreConfig.gradeBands].sort((a, b) => b.minScore - a.minScore);
        const matchedBand = sortedBands.find((b) => percentage >= b.minScore);
        grade = matchedBand ? matchedBand.label : passed ? "\u0E1C\u0E48\u0E32\u0E19" : "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19";
      } else {
        grade = passed ? "\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C" : "\u0E44\u0E21\u0E48\u0E1C\u0E48\u0E32\u0E19\u0E40\u0E01\u0E13\u0E11\u0E4C";
      }
    }
    const submission = await prisma.submission.create({
      data: {
        formVersionId: latestVersion.id,
        userId: userId || null,
        answers,
        score: totalScore,
        maxScore,
        passed,
        grade,
        pdpaConsent: Boolean(pdpaConsent)
      },
      include: {
        user: {
          select: { id: true, fullName: true, username: true }
        }
      }
    });
    await createAuditLog({
      userId: userId || null,
      action: "SUBMIT_FORM",
      entity: "Submission",
      entityId: submission.id,
      meta: {
        formId,
        formTitle: form.title,
        version: latestVersion.version,
        score: totalScore,
        maxScore,
        passed
      },
      ip: meta.ip,
      userAgent: meta.userAgent
    });
    const showResult = scoreConfig ? scoreConfig.showResultToUser !== false : true;
    return {
      submissionId: submission.id,
      formTitle: form.title,
      isScoreTest,
      score: showResult ? totalScore : null,
      maxScore: showResult ? maxScore : null,
      percentage: showResult && maxScore && maxScore > 0 ? Number((totalScore / maxScore * 100).toFixed(1)) : null,
      passed: showResult ? passed : null,
      grade: showResult ? grade : null,
      showResult,
      flaggedFieldIds: showResult ? flaggedFieldIds : void 0,
      submittedAt: submission.submittedAt
    };
  }
  /**
   * ดึงรายการคำตอบทั้งหมดของแบบฟอร์ม (Submissions) สำหรับเจ้าของฟอร์มหรือ ADMIN
   */
  static async getSubmissions(formId, userId, userRole) {
    const form = await prisma.form.findUnique({
      where: { id: formId },
      include: {
        versions: {
          orderBy: { version: "desc" }
        }
      }
    });
    if (!form) throw new Error("\u0E44\u0E21\u0E48\u0E1E\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21");
    if (form.ownerId !== userId && userRole !== Role3.ADMIN) {
      throw new Error("\u0E04\u0E38\u0E13\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E17\u0E18\u0E34\u0E4C\u0E14\u0E39\u0E1C\u0E25\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E02\u0E2D\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49 (\u0E40\u0E09\u0E1E\u0E32\u0E30\u0E40\u0E08\u0E49\u0E32\u0E02\u0E2D\u0E07\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E1C\u0E39\u0E49\u0E14\u0E39\u0E41\u0E25\u0E23\u0E30\u0E1A\u0E1A)");
    }
    const versionIds = form.versions.map((v) => v.id);
    const submissions = await prisma.submission.findMany({
      where: {
        formVersionId: { in: versionIds }
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            username: true,
            department: { select: { id: true, name: true } }
          }
        },
        formVersion: {
          select: { version: true }
        }
      },
      orderBy: { submittedAt: "desc" }
    });
    const totalCount = submissions.length;
    let passedCount = 0;
    let scoreSum = 0;
    let scoredSubmissionsCount = 0;
    for (const sub of submissions) {
      if (sub.passed === true) passedCount++;
      if (sub.score !== null) {
        scoreSum += sub.score;
        scoredSubmissionsCount++;
      }
    }
    const averageScore = scoredSubmissionsCount > 0 ? Number((scoreSum / scoredSubmissionsCount).toFixed(2)) : 0;
    const passRate = totalCount > 0 ? Number((passedCount / totalCount * 100).toFixed(1)) : 0;
    const latestVersion = form.versions[0];
    const schema = latestVersion?.schema || [];
    return {
      form: {
        id: form.id,
        title: form.title,
        type: form.type,
        schema
      },
      summary: {
        totalSubmissions: totalCount,
        averageScore,
        passedCount,
        passRate
      },
      submissions: submissions.map((s) => ({
        id: s.id,
        userId: s.userId,
        userFullName: s.user?.fullName || "\u0E1C\u0E39\u0E49\u0E15\u0E2D\u0E1A\u0E17\u0E31\u0E48\u0E27\u0E44\u0E1B (Guest / \u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E25\u0E47\u0E2D\u0E01\u0E2D\u0E34\u0E19)",
        username: s.user?.username || "-",
        departmentName: s.user?.department?.name || "\u0E1A\u0E38\u0E04\u0E04\u0E25\u0E20\u0E32\u0E22\u0E19\u0E2D\u0E01",
        version: s.formVersion.version,
        score: s.score,
        maxScore: s.maxScore,
        passed: s.passed,
        grade: s.grade,
        answers: s.answers,
        submittedAt: s.submittedAt
      }))
    };
  }
};

// server/src/modules/form/form.controller.ts
var getClientMeta4 = (req) => ({
  ip: req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  userAgent: req.headers["user-agent"]
});
var FormController = class {
  static async getAll(req, res) {
    try {
      const user = req.user;
      const forms = await FormService.getForms(user.id, user.role, user.departmentId);
      res.status(200).json({ success: true, data: forms });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E36\u0E07\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21"
      });
    }
  }
  static async getById(req, res) {
    try {
      const user = req.user;
      const forEditing = req.query.forEditing === "true";
      const form = await FormService.getById(
        req.params.id,
        user?.id || "",
        user?.role || Role4.USER,
        user?.departmentId || null,
        forEditing
      );
      res.status(200).json({ success: true, data: form });
    } catch (error) {
      res.status(403).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E02\u0E49\u0E32\u0E16\u0E36\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E19\u0E35\u0E49\u0E44\u0E14\u0E49"
      });
    }
  }
  static async create(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const form = await FormService.create(req.body, user.id, meta);
      res.status(201).json({
        success: true,
        message: `\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21 "${form.title}" \u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
        data: form
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E2A\u0E23\u0E49\u0E32\u0E07\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async update(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const form = await FormService.update(req.params.id, req.body, user.id, user.role, meta);
      res.status(200).json({
        success: true,
        message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: form
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async publish(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.publish(
        req.params.id,
        req.body,
        user.id,
        user.role,
        meta
      );
      res.status(200).json({
        success: true,
        message: `\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08 (\u0E40\u0E27\u0E2D\u0E23\u0E4C\u0E0A\u0E31\u0E19 ${result.version})`,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async updateSettings(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const updated = await FormService.updateSettings(
        req.params.id,
        req.body,
        user.id,
        user.role,
        meta
      );
      res.status(200).json({
        success: true,
        message: "\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: updated
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async share(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.shareForm(
        req.params.id,
        req.body.userIds,
        user.id,
        user.role,
        meta
      );
      res.status(200).json({
        success: true,
        message: `\u0E41\u0E0A\u0E23\u0E4C\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E43\u0E2B\u0E49\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49 ${result.count} \u0E04\u0E19\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08`
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E41\u0E0A\u0E23\u0E4C\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async getTrash(req, res) {
    try {
      const user = req.user;
      const forms = await FormService.getTrash(user.id, user.role);
      res.status(200).json({ success: true, data: forms });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E14\u0E36\u0E07\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30"
      });
    }
  }
  static async delete(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.moveToTrash(req.params.id, user.id, user.role, meta);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E22\u0E49\u0E32\u0E22\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E1B\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30\u0E44\u0E14\u0E49"
      });
    }
  }
  static async restore(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.restore(req.params.id, user.id, user.role, meta);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E01\u0E39\u0E49\u0E04\u0E37\u0E19\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E44\u0E14\u0E49"
      });
    }
  }
  static async deletePermanently(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.deletePermanently(req.params.id, user.id, user.role, meta);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { action: result.action }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E16\u0E32\u0E27\u0E23\u0E44\u0E14\u0E49"
      });
    }
  }
  static async emptyTrash(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.emptyTrash(user.id, user.role, meta);
      res.status(200).json({
        success: true,
        message: result.message,
        data: { count: result.count }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E25\u0E49\u0E32\u0E07\u0E16\u0E31\u0E07\u0E02\u0E22\u0E30\u0E44\u0E14\u0E49"
      });
    }
  }
  static async submit(req, res) {
    try {
      const meta = getClientMeta4(req);
      const user = req.user;
      const result = await FormService.submit(
        req.params.id,
        req.body.answers,
        user?.id || null,
        user?.role || Role4.USER,
        user?.departmentId || null,
        meta,
        req.body.pdpaConsent
      );
      res.status(200).json({
        success: true,
        message: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08",
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E15\u0E2D\u0E1A\u0E44\u0E21\u0E48\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08"
      });
    }
  }
  static async getSubmissions(req, res) {
    try {
      const user = req.user;
      const result = await FormService.getSubmissions(
        req.params.id,
        user.id,
        user.role
      );
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(403).json({
        success: false,
        message: error.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E1C\u0E25\u0E15\u0E2D\u0E1A\u0E01\u0E25\u0E31\u0E1A\u0E44\u0E14\u0E49"
      });
    }
  }
};

// server/src/modules/form/form.schema.ts
import { z as z4 } from "zod";
import { FormType as FormType2, FormVisibility as FormVisibility2 } from "@prisma/client";
var fieldTypeEnum = z4.enum([
  "text",
  "textarea",
  "number",
  "single_choice",
  "multi_choice",
  "dropdown",
  "date",
  "rating",
  "file",
  "layer_box"
]);
var formFieldOptionSchema = z4.object({
  id: z4.string(),
  label: z4.string().trim().min(1, "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E04\u0E48\u0E32\u0E27\u0E48\u0E32\u0E07")
});
var formFieldSchema = z4.object({
  id: z4.string(),
  type: fieldTypeEnum,
  label: z4.string().trim().min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E2B\u0E31\u0E27\u0E02\u0E49\u0E2D\u0E04\u0E33\u0E16\u0E32\u0E21\u0E2B\u0E23\u0E37\u0E2D\u0E0A\u0E37\u0E48\u0E2D\u0E01\u0E25\u0E48\u0E2D\u0E07"),
  description: z4.string().optional(),
  required: z4.boolean().default(false),
  placeholder: z4.string().optional(),
  options: z4.array(formFieldOptionSchema).optional(),
  points: z4.number().min(0).optional(),
  correctAnswer: z4.union([z4.string(), z4.number(), z4.array(z4.string())]).optional(),
  layerId: z4.string().nullable().optional(),
  colSpan: z4.number().int().min(1).max(24).optional().default(24),
  columns: z4.number().int().min(1).max(4).optional().default(2)
});
var gradeBandSchema = z4.object({
  label: z4.string(),
  minScore: z4.number()
});
var scoreConfigSchema = z4.object({
  passScore: z4.number().min(0).default(50),
  passType: z4.enum(["percent", "points"]).default("percent"),
  showResultToUser: z4.boolean().default(true),
  gradeBands: z4.array(gradeBandSchema).optional()
});
var createFormSchema = z4.object({
  title: z4.string({ required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21" }).trim().min(2, "\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 2 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23").max(200, "\u0E0A\u0E37\u0E48\u0E2D\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E27\u0E32\u0E21\u0E22\u0E32\u0E27\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19 200 \u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23"),
  description: z4.string().optional(),
  type: z4.nativeEnum(FormType2).default(FormType2.GENERAL),
  visibility: z4.nativeEnum(FormVisibility2).default(FormVisibility2.PRIVATE),
  departmentId: z4.string().nullable().optional(),
  isAcceptingResponses: z4.boolean().optional().default(true),
  requireLogin: z4.boolean().optional().default(true),
  pdpaEnabled: z4.boolean().optional().default(false),
  pdpaTitle: z4.string().nullable().optional(),
  pdpaContent: z4.string().nullable().optional(),
  openAt: z4.string().datetime({ offset: true }).nullable().optional(),
  closeAt: z4.string().datetime({ offset: true }).nullable().optional(),
  allowMultiple: z4.boolean().optional().default(true),
  maxAttempts: z4.number().int().min(1).nullable().optional(),
  schema: z4.array(formFieldSchema).default([]),
  scoreConfig: scoreConfigSchema.optional()
});
var updateFormSchema = z4.object({
  title: z4.string().trim().min(2).max(200).optional(),
  description: z4.string().optional(),
  type: z4.nativeEnum(FormType2).optional(),
  visibility: z4.nativeEnum(FormVisibility2).optional(),
  departmentId: z4.string().nullable().optional(),
  requireLogin: z4.boolean().optional(),
  pdpaEnabled: z4.boolean().optional(),
  pdpaTitle: z4.string().nullable().optional(),
  pdpaContent: z4.string().nullable().optional(),
  schema: z4.array(formFieldSchema).optional(),
  scoreConfig: scoreConfigSchema.optional()
});
var updateFormSettingsSchema = z4.object({
  isAcceptingResponses: z4.boolean().optional(),
  requireLogin: z4.boolean().optional(),
  pdpaEnabled: z4.boolean().optional(),
  pdpaTitle: z4.string().nullable().optional(),
  pdpaContent: z4.string().nullable().optional(),
  openAt: z4.string().datetime({ offset: true }).nullable().optional(),
  closeAt: z4.string().datetime({ offset: true }).nullable().optional(),
  allowMultiple: z4.boolean().optional(),
  maxAttempts: z4.number().int().min(1).nullable().optional(),
  visibility: z4.nativeEnum(FormVisibility2).optional(),
  departmentId: z4.string().nullable().optional()
});
var publishFormSchema = z4.object({
  schema: z4.array(formFieldSchema).min(1, "\u0E41\u0E1A\u0E1A\u0E1F\u0E2D\u0E23\u0E4C\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35\u0E04\u0E33\u0E16\u0E32\u0E21\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22 1 \u0E02\u0E49\u0E2D\u0E01\u0E48\u0E2D\u0E19\u0E40\u0E1C\u0E22\u0E41\u0E1E\u0E23\u0E48"),
  scoreConfig: scoreConfigSchema.optional()
});
var shareFormSchema = z4.object({
  userIds: z4.array(z4.string()).min(1, "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E1C\u0E39\u0E49\u0E43\u0E0A\u0E49\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E01\u0E32\u0E23\u0E41\u0E0A\u0E23\u0E4C\u0E43\u0E2B\u0E49")
});
var submitFormSchema = z4.object({
  answers: z4.record(z4.any(), { required_error: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E2A\u0E48\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E04\u0E33\u0E15\u0E2D\u0E1A" }),
  pdpaConsent: z4.boolean().optional().default(false)
});

// server/src/modules/form/form.routes.ts
var router4 = Router4();
router4.get("/:id", optionalAuthenticate, FormController.getById);
router4.post("/:id/submit", optionalAuthenticate, validate({ body: submitFormSchema }), FormController.submit);
router4.use(authenticate);
router4.get("/", FormController.getAll);
router4.get("/trash", FormController.getTrash);
router4.delete("/trash/empty", FormController.emptyTrash);
router4.post("/", validate({ body: createFormSchema }), FormController.create);
router4.put("/:id", validate({ body: updateFormSchema }), FormController.update);
router4.post("/:id/publish", validate({ body: publishFormSchema }), FormController.publish);
router4.patch("/:id/settings", validate({ body: updateFormSettingsSchema }), FormController.updateSettings);
router4.post("/:id/share", validate({ body: shareFormSchema }), FormController.share);
router4.post("/:id/restore", FormController.restore);
router4.get("/:id/submissions", FormController.getSubmissions);
router4.delete("/:id/permanent", FormController.deletePermanently);
router4.delete("/:id", FormController.delete);
var form_routes_default = router4;

// server/src/modules/setting/setting.routes.ts
import { Router as Router5 } from "express";
import { Role as Role5 } from "@prisma/client";

// server/src/modules/setting/setting.controller.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// server/src/utils/dbManager.ts
import { PrismaClient as PrismaClient2 } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var ENV_PATH = path.resolve(__dirname, "../../.env");
function maskDatabaseUrl(url) {
  if (!url) return "";
  try {
    const atIndex = url.lastIndexOf("@");
    if (atIndex === -1) return url;
    const protocolIndex = url.indexOf("://");
    if (protocolIndex === -1) return url;
    const authPart = url.substring(protocolIndex + 3, atIndex);
    const colonIndex = authPart.indexOf(":");
    if (colonIndex === -1) return url;
    const user = authPart.substring(0, colonIndex);
    return `${url.substring(0, protocolIndex + 3)}${user}:\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022@${url.substring(atIndex + 1)}`;
  } catch {
    return url;
  }
}
function extractHostFromUrl(url) {
  if (!url) return "Unknown";
  try {
    const atIndex = url.lastIndexOf("@");
    if (atIndex !== -1) {
      const rest = url.substring(atIndex + 1);
      const match = rest.match(/^([^:/]+)(?::(\d+))?(?:\/([^?]+))?/);
      if (match) {
        const host = match[1];
        const port = match[2] || "5432";
        const db = match[3] || "postgres";
        return `${host}:${port} (${db})`;
      }
    }
    return url.includes("localhost") ? "localhost:5432 (formlocal_db)" : "Cloud Database";
  } catch {
    return "Unknown Host";
  }
}
async function pingDatabase(url) {
  if (!url || !url.startsWith("postgres")) {
    return { ok: false, error: "Connection string \u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 postgresql://..." };
  }
  const testClient = new PrismaClient2({
    datasources: {
      db: { url }
    },
    log: ["error"]
  });
  const start = Date.now();
  try {
    await testClient.$queryRaw`SELECT 1`;
    const latencyMs = Date.now() - start;
    await testClient.$disconnect();
    return { ok: true, latencyMs };
  } catch (err) {
    try {
      await testClient.$disconnect();
    } catch {
    }
    return {
      ok: false,
      error: err.message || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A Network \u0E2B\u0E23\u0E37\u0E2D Connection String"
    };
  }
}
var DEFAULT_SUPABASE_URL2 = "postgresql://postgres.pgokdsqumwbitqtptuom:ram2Ram2@10666@aws-0-ap-southeast-2.pooler.supabase.com:5432/postgres";
async function getDbStatus() {
  const activeDb = "SUPABASE";
  const currentUrl = process.env.DATABASE_URL || DEFAULT_SUPABASE_URL2;
  const pingResult = await pingDatabase(currentUrl);
  return {
    activeDb,
    currentHost: extractHostFromUrl(currentUrl),
    isSupabaseConfigured: true,
    maskedSupabaseUrl: maskDatabaseUrl(currentUrl),
    hasLocalConfigured: false,
    isConnected: pingResult.ok,
    latencyMs: pingResult.latencyMs ?? null,
    error: pingResult.error
  };
}
async function switchDatabaseTarget(target, newSupabaseUrl) {
  let envContent = "";
  if (fs.existsSync(ENV_PATH)) {
    try {
      envContent = fs.readFileSync(ENV_PATH, "utf-8");
    } catch {
    }
  }
  let localUrl = process.env.DATABASE_URL_LOCAL || "postgresql://postgres:ram2%231234@localhost:5432/formlocal_db?schema=public";
  let supabaseUrl = newSupabaseUrl?.trim() || process.env.DATABASE_URL_SUPABASE || "";
  let targetUrl = target === "LOCAL" ? localUrl : supabaseUrl;
  if (target === "SUPABASE" && (!targetUrl || targetUrl.trim().length < 15)) {
    throw new Error("\u0E01\u0E23\u0E38\u0E13\u0E32\u0E01\u0E23\u0E2D\u0E01 Supabase Connection String \u0E01\u0E48\u0E2D\u0E19\u0E17\u0E33\u0E01\u0E32\u0E23\u0E2A\u0E25\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D");
  }
  const test = await pingDatabase(targetUrl);
  if (!test.ok) {
    throw new Error(
      `\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E22\u0E31\u0E07 ${target === "LOCAL" ? "Local PostgreSQL" : "Supabase"} \u0E44\u0E14\u0E49: ${test.error}`
    );
  }
  if (/ACTIVE_DB=.*(\r?\n|$)/.test(envContent)) {
    envContent = envContent.replace(/ACTIVE_DB=.*(\r?\n|$)/, `ACTIVE_DB="${target}"$1`);
  } else {
    envContent += `
ACTIVE_DB="${target}"`;
  }
  if (newSupabaseUrl && newSupabaseUrl.trim()) {
    if (/DATABASE_URL_SUPABASE=.*(\r?\n|$)/.test(envContent)) {
      envContent = envContent.replace(/DATABASE_URL_SUPABASE=.*(\r?\n|$)/, `DATABASE_URL_SUPABASE="${supabaseUrl}"$1`);
    } else {
      envContent += `
DATABASE_URL_SUPABASE="${supabaseUrl}"`;
    }
  }
  if (/DATABASE_URL=.*(\r?\n|$)/.test(envContent)) {
    envContent = envContent.replace(/DATABASE_URL=.*(\r?\n|$)/, `DATABASE_URL="${targetUrl}"$1`);
  } else {
    envContent += `
DATABASE_URL="${targetUrl}"`;
  }
  fs.writeFileSync(ENV_PATH, envContent, "utf-8");
  process.env.ACTIVE_DB = target;
  if (newSupabaseUrl) process.env.DATABASE_URL_SUPABASE = supabaseUrl;
  process.env.DATABASE_URL = targetUrl;
  return {
    success: true,
    message: `\u0E2A\u0E25\u0E31\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E22\u0E31\u0E07 ${target === "LOCAL" ? "Local PostgreSQL (\u0E40\u0E04\u0E23\u0E37\u0E48\u0E2D\u0E07 Dev)" : "Supabase Cloud"} \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E40\u0E23\u0E35\u0E22\u0E1A\u0E23\u0E49\u0E2D\u0E22\u0E41\u0E25\u0E49\u0E27`,
    activeDb: target,
    latencyMs: test.latencyMs
  };
}

// server/src/modules/setting/setting.controller.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path2.dirname(__filename2);
var DATA_DIR = path2.resolve(__dirname2, "../../../data");
var SETTINGS_FILE = path2.join(DATA_DIR, "system-settings.json");
var DEFAULT_SETTINGS = {
  systemFont: "Sarabun",
  updatedAt: null,
  updatedBy: null
};
var readSettings = () => {
  try {
    if (!fs2.existsSync(SETTINGS_FILE)) {
      return DEFAULT_SETTINGS;
    }
    const raw = fs2.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      systemFont: parsed.systemFont === "IBMPlexSans" ? "IBMPlexSans" : "Sarabun",
      updatedAt: parsed.updatedAt || null,
      updatedBy: parsed.updatedBy || null
    };
  } catch (error) {
    console.error("Error reading settings file:", error);
    return DEFAULT_SETTINGS;
  }
};
var writeSettings = (data) => {
  if (!fs2.existsSync(DATA_DIR)) {
    fs2.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs2.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), "utf-8");
};
var getSystemSettings = async (_req, res) => {
  try {
    const settings = readSettings();
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E14\u0E36\u0E07\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E23\u0E30\u0E1A\u0E1A\u0E44\u0E14\u0E49"
    });
  }
};
var updateSystemSettings = async (req, res) => {
  try {
    const { systemFont } = req.body;
    if (!systemFont || !["Sarabun", "IBMPlexSans"].includes(systemFont)) {
      res.status(400).json({
        success: false,
        message: '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38\u0E1F\u0E2D\u0E19\u0E15\u0E4C\u0E17\u0E35\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07 ("Sarabun" \u0E2B\u0E23\u0E37\u0E2D "IBMPlexSans")'
      });
      return;
    }
    const currentSettings = readSettings();
    const previousFont = currentSettings.systemFont;
    const newSettings = {
      systemFont,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedBy: req.user?.fullName || req.user?.username || "ADMIN"
    };
    writeSettings(newSettings);
    await createAuditLog({
      userId: req.user?.id,
      action: "UPDATE_SYSTEM_FONT",
      entity: "SystemSetting",
      meta: {
        previousFont,
        newFont: systemFont
      },
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });
    res.status(200).json({
      success: true,
      data: newSettings,
      message: `\u0E40\u0E1B\u0E25\u0E35\u0E48\u0E22\u0E19\u0E1F\u0E2D\u0E19\u0E15\u0E4C\u0E23\u0E30\u0E1A\u0E1A\u0E40\u0E1B\u0E47\u0E19 ${systemFont === "IBMPlexSans" ? "IBM Plex Sans" : "Sarabun"} \u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08\u0E41\u0E25\u0E49\u0E27`
    });
  } catch (error) {
    console.error("Error updating system settings:", error);
    res.status(500).json({
      success: false,
      message: "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E1A\u0E31\u0E19\u0E17\u0E36\u0E01\u0E01\u0E32\u0E23\u0E15\u0E31\u0E49\u0E07\u0E04\u0E48\u0E32\u0E23\u0E30\u0E1A\u0E1A"
    });
  }
};
var getDatabaseSettings = async (_req, res) => {
  try {
    const status = await getDbStatus();
    res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E2A\u0E16\u0E32\u0E19\u0E30\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49: " + (error.message || "")
    });
  }
};
var testDatabaseConnection = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      res.status(400).json({ success: false, message: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 Connection String \u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E17\u0E14\u0E2A\u0E2D\u0E1A" });
      return;
    }
    const testResult = await pingDatabase(url);
    if (testResult.ok) {
      res.status(200).json({
        success: true,
        message: "\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E2A\u0E33\u0E40\u0E23\u0E47\u0E08!",
        latencyMs: testResult.latencyMs
      });
    } else {
      res.status(400).json({
        success: false,
        message: testResult.error || "\u0E44\u0E21\u0E48\u0E2A\u0E32\u0E21\u0E32\u0E23\u0E16\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E14\u0E49"
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E17\u0E14\u0E2A\u0E2D\u0E1A\u0E01\u0E32\u0E23\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21\u0E15\u0E48\u0E2D"
    });
  }
};
var switchDatabase = async (req, res) => {
  try {
    const { target, supabaseUrl } = req.body;
    if (!target || !["LOCAL", "SUPABASE"].includes(target)) {
      res.status(400).json({ success: false, message: '\u0E01\u0E23\u0E38\u0E13\u0E32\u0E23\u0E30\u0E1A\u0E38 target \u0E40\u0E1B\u0E47\u0E19 "LOCAL" \u0E2B\u0E23\u0E37\u0E2D "SUPABASE"' });
      return;
    }
    const previousDb = process.env.ACTIVE_DB || "LOCAL";
    const result = await switchDatabaseTarget(target, supabaseUrl);
    await createAuditLog({
      userId: req.user?.id,
      action: "SWITCH_DATABASE_TARGET",
      entity: "SystemSetting",
      meta: {
        from: previousDb,
        to: target,
        latencyMs: result.latencyMs
      },
      ip: req.ip,
      userAgent: req.headers["user-agent"]
    });
    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        activeDb: result.activeDb,
        latencyMs: result.latencyMs
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E43\u0E19\u0E01\u0E32\u0E23\u0E2A\u0E25\u0E31\u0E1A\u0E10\u0E32\u0E19\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25"
    });
  }
};

// server/src/modules/setting/setting.routes.ts
var router5 = Router5();
router5.get("/", getSystemSettings);
router5.patch("/", authenticate, authorize(Role5.ADMIN), updateSystemSettings);
router5.get("/database", authenticate, authorize(Role5.ADMIN), getDatabaseSettings);
router5.post("/database/test", authenticate, authorize(Role5.ADMIN), testDatabaseConnection);
router5.post("/database/switch", authenticate, authorize(Role5.ADMIN), switchDatabase);
var setting_routes_default = router5;

// server/src/app.ts
var app = express();
var PORT = process.env.PORT || 4e3;
var CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === "production" ? void 0 : false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed = origin === CLIENT_URL || origin.endsWith(".vercel.app") || origin.includes("localhost") || origin.includes("127.0.0.1") || /^http:\/\/(192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|10\.)/.test(origin);
      if (isAllowed || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error(`CORS policy blocked access from origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.get(["/api/ping", "/ping"], (_req, res) => {
  res.status(200).send("pong");
});
app.get(["/api/health", "/health"], (_req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    uptime: process.uptime()
  });
});
app.get(["/api/network-info", "/network-info"], (_req, res) => {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  res.status(200).json({
    success: true,
    primaryIp: addresses[0] || "localhost",
    addresses,
    clientPort: 5173
  });
});
app.use(["/api/auth", "/auth"], auth_routes_default);
app.use(["/api/departments", "/departments"], department_routes_default);
app.use(["/api/users", "/users"], user_routes_default);
app.use(["/api/forms", "/forms"], form_routes_default);
app.use(["/api/settings", "/settings"], setting_routes_default);
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "\u0E44\u0E21\u0E48\u0E1E\u0E1A API endpoint \u0E17\u0E35\u0E48\u0E40\u0E23\u0E35\u0E22\u0E01\u0E43\u0E0A\u0E49\u0E07\u0E32\u0E19"
  });
});
app.use((err, _req, res, _next) => {
  console.error("Unhandled Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "\u0E40\u0E01\u0E34\u0E14\u0E02\u0E49\u0E2D\u0E1C\u0E34\u0E14\u0E1E\u0E25\u0E32\u0E14\u0E20\u0E32\u0E22\u0E43\u0E19\u0E40\u0E0B\u0E34\u0E23\u0E4C\u0E1F\u0E40\u0E27\u0E2D\u0E23\u0E4C"
  });
});
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\u{1F680} FormLocal Server running on http://localhost:${PORT}`);
    console.log(`\u{1F4E1} CORS allowed for: ${CLIENT_URL}`);
  });
}
var app_default = app;
export {
  app_default as default
};
