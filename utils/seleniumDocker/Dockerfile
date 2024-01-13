FROM selenium/standalone-chrome:120.0

ARG DEFAULT_VNC_PASSWORD=someComplexPassword

ARG CROME_RUNNER_SH_NAME=chrome-runner.sh

USER root
RUN apt-get update -y && apt-get install vim -y \
    && rm -rf /var/lib/apt/lists/*

RUN sed -i "s/wait\s/\/home\/seluser\/PTRentNotifier\/utils\/seleniumDocker\/${CROME_RUNNER_SH_NAME} \&\nwait /g" /opt/bin/entry_point.sh 
RUN cat /opt/bin/entry_point.sh 
RUN echo "Trying to copy existing profile!" 

COPY ./chrome-profile/  /tmp/chrome-profile
RUN chown -R 1200:1201 /tmp/chrome-profile
USER seluser

RUN if [ -d "/tmp/chrome-profile" ] && [ "$(ls -A /tmp/chrome-profile/)" ]; then \
        mkdir -p /home/seluser/.config/google-chrome && mv  /tmp/chrome-profile/* /home/seluser/.config/google-chrome/ && rm -rf /tmp/chrome-profile; \
    fi
ADD ./PTRentNotifier/ /home/seluser/PTRentNotifier
ADD ./GPTScrap/ /home/seluser/GPTScrap
RUN x11vnc -storepasswd ${DEFAULT_VNC_PASSWORD} /home/seluser/.vnc/passwd
