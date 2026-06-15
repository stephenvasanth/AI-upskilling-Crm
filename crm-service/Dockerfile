FROM maven:3.9-eclipse-temurin-21

WORKDIR /app

# Cache dependencies in their own layer so they're only re-downloaded when pom.xml changes.
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src

EXPOSE 8093

CMD ["mvn", "-q", "spring-boot:run"]
