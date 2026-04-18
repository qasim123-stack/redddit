import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    backendToken: string;
    backendUser: {
      id: number;
      email: string;
      full_name: string | null;
      is_active: boolean;
      is_verified: boolean;
      subscription_tier: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
    backendUser?: {
      id: number;
      email: string;
      full_name: string | null;
      is_active: boolean;
      is_verified: boolean;
      subscription_tier: string;
    };
  }
}
