export const msalConfig = {
  auth: {
    clientId: "0995406b-b8ad-4853-98c7-73fe8aea7e04",
    authority: "https://login.microsoftonline.com/common",
    redirectUri: typeof window !== "undefined" ? `${window.location.origin}/auth-callback` : "http://localhost:3000/auth-callback",
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes for permissions
export const loginRequest = {
  scopes: ["User.Read", "Files.ReadWrite.All", "Sites.Read.All"], // LECTURA Y ESCRITURA + Sitios
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
