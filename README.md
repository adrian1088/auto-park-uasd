
# Auto Park UASD
## Tabla de contenido
- [Descripción](#descripción)
- [Instalación](#instalación)
- [Ejecutar la aplicación](#ejecutar-la-aplicación)
- [Migraciones](#migraciones)
- [Test](#test)

## Descripción
Sistema de gestión de parqueo para la UASD.

## Instalación

```bash
$ npm install
```

## Ejecutar la aplicación

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Migraciones

### Crear una migración vacía

```bash
npm run migration:create -- src/database/migrations/AddParkingTable
```

### Generar una migración desde los cambios en las entidades

```bash
npm run migration:generate -- src/database/migrations/AddParkingTable
```

### Ejecutar las migraciones pendientes

```bash
npm run migration:run
```

### Revertir la última migración ejecutada

```bash
npm run migration:revert
```

> Asegúrate de tener configurada la conexión a la base de datos antes de ejecutar cualquiera de estos comandos.

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

