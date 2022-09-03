FROM selenium/standalone-chrome:4.4.0-20220831


ARG DEFULT_VNC_PASSWORD=someComplexPassword

RUN apt-get update && apt-get install vim \
    && rm -rf /var/lib/apt/lists/*  
    
RUN x11vnc -storepasswd ${DEFULT_VNC_PASSWORD} /home/seluser/.vnc/passwd