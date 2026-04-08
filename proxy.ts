export { proxy } from "./src/proxy";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/login",
    "/signup",
  ],
};
