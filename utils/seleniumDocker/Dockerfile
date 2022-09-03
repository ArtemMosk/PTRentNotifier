FROM selenium/standalone-chrome:4.4.0-20220831


ARG DEFULT_VNC_PASSWORD=someComplexPassword
USER root
RUN apt-get update && apt-get install -y vim \
    && rm -rf /var/lib/apt/lists/*  
USER seluser
    
RUN x11vnc -storepasswd ${DEFULT_VNC_PASSWORD} /home/seluser/.vnc/passwd
