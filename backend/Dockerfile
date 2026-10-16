FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

COPY . .
RUN chmod +x gradlew
RUN ./gradlew --no-daemon shadowJar -PuseTestResources=false

FROM eclipse-temurin:25-jre
WORKDIR /app

COPY --from=build /app/build/libs/*-all.jar /app/app.jar

USER 10001
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]