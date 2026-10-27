1. Check Docker and Docker Compose
docker --version
docker compose version
docker ps


If docker ps runs successfully, continue.
2. Create the project folder
mkdir -p program-5
cd program-5


3. File 1: Dockerfile
Create the file:
nano Dockerfile


Paste:
FROM jenkins/jenkins:lts

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

USER jenkins


Save using Ctrl + O, press Enter, then Ctrl + X.
4. File 2: docker-compose.yml
Create the file:
nano docker-compose.yml


Paste this code:
services:
  jenkins:
    build: .
    container_name: jenkins-ci
    ports:
      - "8081:8080"
      - "50001:50000"
    volumes:
      - jenkins_home:/var/jenkins_home
    restart: unless-stopped

volumes:
  jenkins_home:


Save using Ctrl + O → Enter → Ctrl + X.

We use host port 8081 instead of 8080 to reduce the chance of a port conflict. Jenkins still listens on port 8080 inside the container.
5. Build and run Jenkins
Execute these commands inside the program-5 folder.
docker compose config
docker compose up -d --build


Check the running container:
docker ps


Check the logs:
docker compose logs -f jenkins


Wait until Jenkins finishes starting. Press Ctrl + C to exit the log display; this does not stop Jenkins.
6. Open Jenkins
Open this address in your browser:
http://localhost:8081Get the initial administrator password using:
docker exec jenkins-ci cat /var/jenkins_home/secrets/initialAdminPassword


Copy the password displayed in the terminal and enter it on the Jenkins page.

Then:
1. Click Install suggested plugins.
2. Create your administrator account.
3. Finish the setup.
7. Demonstrate CI with a Jenkins job
Once Jenkins is ready:
1. Click New Item.
2. Enter CI-Demo.
3. Select Freestyle project and click OK.
4. Under Build Steps, select Add build step → Execute shell.
5. Enter:
echo "CI build started"
echo "Building the application..."
echo "CI build completed successfully"


6. Click Save → Build Now.
7. Open the build number and click Console Output.
Expected output:
CI build started
Building the application...
CI build completed successfully
Finished: SUCCESS


This demonstrates a basic CI build executed by Jenkins.
8. Commands to manage Jenkins
Task	Command
Check running containers	docker ps
View Jenkins logs	docker compose logs -f jenkins
Stop Jenkins	docker compose stop
Start Jenkins	docker compose start
Stop and remove the container	docker compose down
Rebuild Jenkins	docker compose up -d --build
List Docker images	docker images

To remove the Jenkins image after stopping the service:
docker rmi program-5-jenkins


If Docker reports that the image is in use, ensure the container has been removed first. The jenkins_home volume preserves Jenkins configuration and jobs even when the container is removed.
9. How to fix common errors
Error: Port is already allocated

Change the port mappings in docker-compose.yml to:
ports:
  - "8082:8080"
  - "50002:50000"


Then run:
docker compose up -d


Open http://localhost:8082.

Error: Container name already in use
docker rm -f jenkins-ci
docker compose up -d --build


Error: Jenkins password file not found

Wait for Jenkins to finish starting and check:
docker compose logs jenkins


Then retry:
docker exec jenkins-ci cat /var/jenkins_home/secrets/initialAdminPassword


Error: Docker Compose command not found

Check:
docker compose version


Use Docker Compose v2 (docker compose with a space). If it is missing, install the Compose plugin using the instructions for your Docker installation.

Error: Permission denied when using Docker
sudo docker ps


If this works but docker ps does not, your user may not have Docker permissions. You can continue using sudo before Docker commands.

Error: Jenkins container exits
docker ps -a
docker logs jenkins-ci


Use the displayed error to identify the issue before rebuilding.
10. Expected outcome
- Jenkins runs inside a Docker container.
- Jenkins is accessible through a browser.
- A CI job executes shell commands and reports SUCCESS.
- Docker Compose manages the Jenkins service and persistent data.
