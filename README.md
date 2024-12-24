# Cafeteria del Caos API

The **Cafeteria del Caos API** is built using [NestJS](https://nestjs.com/) and designed to serve the Cafeteria del Caos community on Discord. It provides various endpoints to manage community-related content and facilitate knowledge sharing.

## Project Description

This API offers features for managing events, publications, and other content related to the Cafeteria del Caos community. It is implemented with a modular architecture using NestJS, supports relational databases via TypeORM and PostgreSQL, and includes automatically generated documentation with Swagger and automated testing with Jest.

### Technologies Used

- **NestJS**: A framework for building efficient server-side applications.
- **TypeORM**: ORM that simplifies interaction with databases.
- **PostgreSQL**: Relational database.
- **Swagger**: Automatically generates API documentation.
- **Jest**: Testing framework for Node.js.

## API Documentation

The complete API documentation is available at the following link:

[https://cafeteriadelcaos-api-zlkelu7v2a-uc.a.run.app/api](https://cafeteriadelcaos-api-zlkelu7v2a-uc.a.run.app/api)

## Getting Started

### Prerequisites

- Node.js >= 14.x
- npm >= 6.x or yarn >= 1.x
- PostgreSQL

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/stevenvo780/cafeteriadelcaos-api.git
    cd cafeteria-del-caos-api
    ```

2. Install dependencies:

    ```bash
    npm install
    ```

    or

    ```bash
    yarn install
    ```

3. Configure environment variables by creating a `.env` file in the project root directory. Be sure to include your PostgreSQL database configuration and other necessary variables:

    ```bash
    DATABASE_URL=postgres://user:password@localhost:5432/cafeteriadelcaos
    ```

### Variables de Entorno y Secretos

#### Local Development
Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

### Running the Application

You can run the application in different modes depending on your needs:

```bash
# Development mode
npm run start

# Watch mode (with auto-reloading)
npm run start:dev

# Production mode
npm run start:prod
```

### Using Docker (Optional)

If you prefer using Docker, ensure Docker is installed and follow these steps:

1. Build the Docker image:

    ```bash
    docker build -t cafeteria-del-caos-api .
    ```

2. Run the container:

    ```bash
    docker run -p 3000:3000 cafeteria-del-caos-api
    ```

3. Open [http://localhost:3000](http://localhost:3000) in your browser to view the application running in Docker.

### Variables de Entorno y Secretos

#### Docker
Para configurar las variables de entorno en Docker, puedes pasar el archivo `.env` al contenedor usando la opción `--env-file`:

```bash
docker run --env-file .env -p 3000:3000 cafeteria-del-caos-api
```

#### Google Cloud Build
Para configurar las variables de entorno en Google Cloud Build, puedes usar `secretManager` para gestionar tus secretos de forma segura. Aquí tienes un ejemplo de configuración en el archivo `cloudbuild.yaml`:

```yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'gcr.io/$PROJECT_ID/cafeteria-del-caos-api', '.']
  secretEnv: ['DATABASE_URL']
secrets:
- kmsKeyName: projects/$PROJECT_ID/locations/global/keyRings/$KEYRING/cryptoKeys/$KEY
  secretEnv:
    DATABASE_URL: 'projects/$PROJECT_ID/secrets/DATABASE_URL/versions/latest'
```

## Testing

The API includes automated tests. You can run them using the following commands:

```bash
# Unit tests
npm run test

# End-to-end (e2e) tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Contributions

This project is open-source and welcomes community contributions. If you're interested in contributing, please follow these steps:

1. Fork the repository.
2. Create a new branch (`git checkout -b feature/new-feature`).
3. Make your changes (`git commit -m 'Add new feature'`).
4. Push the branch (`git push origin feature/new-feature`).
5. Create a new Pull Request.

## Support

If you find the Cafeteria del Caos API useful, consider supporting the project by contributing code, reporting issues, or sharing the project.

## API Documentation

https://cafeteriadelcaos-api-zlkelu7v2a-uc.a.run.app/api

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
```

Let me know if you need additional adjustments or further refinements!