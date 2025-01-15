FROM selenium/standalone-chrome:120.0

ARG DEFAULT_VNC_PASSWORD=someComplexPassword

ARG CROME_RUNNER_SH_NAME=chrome-runner.sh

USER root
RUN apt-get update -y && apt-get install git vim -y \
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

ARG EXTENSION_REPOS="ArtemMosk:PTRentNotifier:main"
ARG DEFAULT_USER=ArtemMosk
ARG DEFAULT_BRANCH=main

# First, add version checks for all repos to invalidate cache when needed
RUN for repo_spec in $EXTENSION_REPOS; do \
        repo=$(echo $repo_spec | cut -d: -f1); \
        user=$(echo $repo_spec | cut -d: -f2 -s || echo $DEFAULT_USER); \
        branch=$(echo $repo_spec | cut -d: -f3 -s || echo $DEFAULT_BRANCH); \
        \
        # Add version.json for each repo and verify it exists
        curl -s -o /home/seluser/${repo}_version.json https://api.github.com/repos/$user/$repo/git/refs/heads/$branch \
            && echo "Version file created for $repo: " \
            && cat /home/seluser/${repo}_version.json \
            || echo "Failed to create version file for $repo"; \
    done

# Then clone all repos
RUN for repo_spec in $EXTENSION_REPOS; do \
        repo=$(echo $repo_spec | cut -d: -f1); \
        user=$(echo $repo_spec | cut -d: -f2 -s || echo $DEFAULT_USER); \
        branch=$(echo $repo_spec | cut -d: -f3 -s || echo $DEFAULT_BRANCH); \
        \
        git clone -b $branch https://github.com/$user/$repo.git /home/seluser/$repo; \
    done
    
    
ADD ./GPTScrap/ /home/seluser/GPTScrap
RUN x11vnc -storepasswd ${DEFAULT_VNC_PASSWORD} /home/seluser/.vnc/passwd
# Support multiple extension repositories
