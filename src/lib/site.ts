export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const joinLink = (code: string) => `${siteUrl}/j/${code}`;

export const whatsappShare = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;

/** Show the test-number hint on the login screen (local dev and preview builds only). */
export const showTestLogin = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_TEST_LOGIN === "1";
