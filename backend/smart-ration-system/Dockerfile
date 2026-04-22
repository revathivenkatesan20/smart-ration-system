# --- Stage 1: Build Stage ---
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy the pom and mvnw to leverage Docker layer caching for dependencies
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN chmod +x mvnw

# Download dependencies (this layer will be cached unless pom.xml changes)
RUN ./mvnw dependency:go-offline -B

# Copy the source code and build the application
COPY src src
RUN ./mvnw clean package -DskipTests

# --- Stage 2: Runtime Stage ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy only the compiled jar from the build stage
COPY --from=build /app/target/smart-ration-system-0.0.1-SNAPSHOT.jar app.jar

# Expose the default Spring Boot port
EXPOSE 8080

# Run the application
# We use -Dserver.port=${PORT:8080} to satisfy Render's dynamic port requirement
ENTRYPOINT ["java", "-Dserver.port=${PORT:8080}", "-jar", "app.jar"]
