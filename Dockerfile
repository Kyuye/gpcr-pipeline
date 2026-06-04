FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html app.js chart.js styles.css /usr/share/nginx/html/

EXPOSE 80
