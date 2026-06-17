import axios from "axios";

export const api =
  axios.create({
    baseURL:
      import.meta.env
        .VITE_API_URL,
  });

api.interceptors.request.use(
  (config) => {

    const token =
      localStorage.getItem(
        "auth_token"
      );

    if (token) {

      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status =
      error?.response?.status;

    const hasToken =
      Boolean(
        localStorage.getItem(
          "auth_token"
        )
      );

    if (
      status === 401 &&
      hasToken
    ) {
      localStorage.removeItem(
        "auth_token"
      );

      if (
        window.location.pathname
          .startsWith("/admin") &&
        window.location.pathname !==
          "/admin/login"
      ) {
        window.location.replace(
          "/admin/login"
        );
      }
    }

    return Promise.reject(error);
  }
);
