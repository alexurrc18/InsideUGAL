FROM nginx:alpine
# Copiază toate fișierele din proiectul vostru în folderul unde Nginx știe să le afișeze
COPY . /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]