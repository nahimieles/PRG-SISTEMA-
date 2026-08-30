
const getRedirectUri = () => {
  if (typeof window === "undefined") {
    return "http://localhost:3000/auth-callback";
  }
  const origin = window.location.origin;
  return `${origin}/auth-callback`;
};
export const msalConfig = {
  auth: {
    clientId: "0995406b-b8ad-4853-98c7-73fe8aea7e04",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: getRedirectUri(),
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: true, 
  },
};
export const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite.All", "Sites.Read.All"], 
};
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
