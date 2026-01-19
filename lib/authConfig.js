export const msalConfig = {
  auth: {
    clientId: "0995406b-b8ad-4853-98c7-73fe8aea7e04", // Se reemplazará con el ID real
    authority: "https://login.microsoftonline.com/common",
    redirectUri: "https://nextjs-boilerplate-delta-bay-eez7fy3o9d.vercel.app",
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
};

// Scopes for permissions
export const loginRequest = {
  scopes: ["User.Read", "Files.Read.All", "Sites.Read.All"], // SOLO LECTURA + Sitios
};

export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
};
