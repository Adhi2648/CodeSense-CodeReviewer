import { Router } from "express";
import passport, { Profile } from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { env } from "../config/env.js";
import { prisma } from "../lib/prisma.js";
import { SessionUser } from "../types/auth.js";

type VerifyDone = (error: Error | null, user?: SessionUser | false) => void;

export const configurePassport = (): void => {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback"
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: VerifyDone
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          const avatarUrl = profile.photos?.[0]?.value ?? null;

          const user = await prisma.user.upsert({
            where: { githubId: profile.id },
            update: {
              username: profile.username ?? profile.displayName ?? "github-user",
              avatarUrl,
              email: email ?? null
            },
            create: {
              githubId: profile.id,
              username: profile.username ?? profile.displayName ?? "github-user",
              avatarUrl,
              email: email ?? null
            }
          });

          done(null, {
            id: user.id,
            githubId: user.githubId,
            username: user.username,
            avatarUrl: user.avatarUrl,
            email: user.email
          } satisfies SessionUser);
        } catch (error) {
          done(error as Error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user as SessionUser);
  });
};

export const authRouter = Router();

authRouter.get("/github", passport.authenticate("github", { scope: ["user:email"] }));

authRouter.get(
  "/github/callback",
  passport.authenticate("github", {
    failureRedirect: `${env.FRONTEND_URL}/?auth=failed`,
    session: true
  }),
  (req, res) => {
    res.redirect(`${env.FRONTEND_URL}/dashboard`);
  }
);

authRouter.get("/me", (req, res) => {
  res.json(req.user ?? null);
});

authRouter.post("/logout", (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      next(logoutError);
      return;
    }
    req.session.destroy((sessionError) => {
      if (sessionError) {
        next(sessionError);
        return;
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ ok: true });
    });
  });
});
