FROM selenium/standalone-chrome:120.0

ARG DEFULT_VNC_PASSWORD=someComplexPassword
ARG CROME_RUNNER_SH_NAME=chrome-runner.sh

USER root
RUN apt-get update -y && apt-get install vim -y \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i "s/wait\s/\/home\/seluser\/PTRentNotifier\/utils\/seleniumDocker\/${CROME_RUNNER_SH_NAME} \&\nwait /g" /opt/bin/entry_point.sh 
RUN cat /opt/bin/entry_point.sh  
USER seluser
ADD ./PTRentNotifier/ /home/seluser/PTRentNotifier
ADD ./GPTScrap/ /home/seluser/GPTScrap
RUN x11vnc -storepasswd ${DEFULT_VNC_PASSWORD} /home/seluser/.vnc/passwd
