import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, InsertUser } from "@shared/schema";
import MemoryStore from "memorystore";

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string | null;
      lastName: string | null;
      profileImageUrl: string | null;
      locationSharingEnabled: boolean | null;
      locationHistoryEnabled: boolean | null;
      notificationsEnabled: boolean | null;
    }
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // Use memory store for sessions with better persistence settings
  const MemStore = MemoryStore(session);
  const sessionStore = new MemStore({
    checkPeriod: sessionTtl,
    max: 10000, // Maximum number of sessions to store
    ttl: sessionTtl, // Time to live for sessions
    dispose: (key: string, val: any) => {
      // Optional cleanup when session expires
    },
  });

  const sessionSettings: session.SessionOptions = {
    secret:
      process.env.SESSION_SECRET ||
      "fallback-secret-key-for-development-very-long-key",
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    rolling: true, // Reset maxAge on every request
    cookie: {
      httpOnly: true,
      secure: false, // Set to false for development
      maxAge: sessionTtl,
      sameSite: "lax", // Allow cross-site requests but maintain security
    },
    name: "familylocator.sid", // Custom session name
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          console.log("[Passport] Looking up user:", email);
          const user = await storage.getUserByEmail(email);
          
          if (!user) {
            console.log("[Passport] User not found:", email);
            return done(null, false);
          }
          
          console.log("[Passport] User found, comparing passwords...");
          console.log("[Passport] Supplied password length:", password.length);
          console.log("[Passport] Stored password hash preview:", user.password.substring(0, 20));
          
          const passwordMatch = await comparePasswords(password, user.password);
          console.log("[Passport] Password match result:", passwordMatch);
          
          if (!passwordMatch) {
            console.log("[Passport] Password mismatch for user:", email);
            return done(null, false);
          } else {
            console.log("[Passport] Authentication successful for:", email);
            return done(null, user);
          }
        } catch (error) {
          console.error("[Passport] Error during authentication:", error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Email and password are required" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        profileImageUrl: null,
        locationSharingEnabled: true,
        locationHistoryEnabled: true,
        notificationsEnabled: true,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          locationSharingEnabled: user.locationSharingEnabled ?? true,
          locationHistoryEnabled: user.locationHistoryEnabled ?? true,
          notificationsEnabled: user.notificationsEnabled ?? true,
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    // Debug logging
    console.log("[Login] Request body:", JSON.stringify(req.body, null, 2));
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[Login] Error:", err);
        return next(err);
      }
      if (!user) {
        console.log("[Login] Authentication failed - no user returned");
        return res.status(401).json({ message: "Invalid email or password" });
      }
      console.log("[Login] User authenticated:", user.email);
      req.login(user, (err) => {
        if (err) {
          console.error("[Login] Session error:", err);
          return next(err);
        }
        res.status(200).json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          locationSharingEnabled: user.locationSharingEnabled ?? true,
          locationHistoryEnabled: user.locationHistoryEnabled ?? true,
          notificationsEnabled: user.notificationsEnabled ?? true,
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: req.user.profileImageUrl,
      locationSharingEnabled: req.user.locationSharingEnabled ?? true,
      locationHistoryEnabled: req.user.locationHistoryEnabled ?? true,
      notificationsEnabled: req.user.notificationsEnabled ?? true,
    });
  });

  // Alias for compatibility with frontend useAuth hook
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      profileImageUrl: req.user.profileImageUrl,
      locationSharingEnabled: req.user.locationSharingEnabled ?? true,
      locationHistoryEnabled: req.user.locationHistoryEnabled ?? true,
      notificationsEnabled: req.user.notificationsEnabled ?? true,
    });
  });
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
}
