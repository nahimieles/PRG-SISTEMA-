export const msalConfig = {
    auth: {
      clientId: "0995406b-b8ad-4853-98c7-73fe8aea7e04", // Se reemplazará con el ID real
      authority: "https://login.microsoftonline.com/common",
      redirectUri: "http://localhost:3000/trabajadores/archivos",
    },
    cache: {
      cacheLocation: "sessionStorage",
      storeAuthStateInCookie: false,
    },
  };
  
  // Scopes for permissions
  export const loginRequest = {
    scopes: ["User.Read", "Files.Read.All"], // SOLO LECTURA
  };
  
  export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
  };
