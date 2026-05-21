<<<<<<< HEAD
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
=======
  FROM nginx:alpine
  COPY . /usr/share/nginx/html
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
>>>>>>> c6bc3607a4de69109635b17e3ea72dbedabdf6c6
