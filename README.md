<!--lint disable awesome-list-item-->
<div align="center">
  <p align="center">
    <img alt="Medusa" src="https://user-images.githubusercontent.com/7554214/129161578-19b83dc8-fac5-4520-bd48-53cba676edd2.png" width="200" />
  </p>
  <h1>Extend medusa to fit your needs</h1>
    
  <a href="https://github.com/adrien2p/awesome-medusajs">
      <img src="https://awesome.re/badge.svg" alt="Awesome">
  </a>
  <a href="https://badge.fury.io/js/medusa-extender"><img src="https://badge.fury.io/js/medusa-extender.svg" alt="npm version" height="18"></a>
</div>

# Getting started

Installation

```bash
npm i medusa-extender
```

# Introduction

This packages exports the necessary bits and pieces to extend [medusajs](https://github.com/medusajs/medusa)
and fit your needs.

- You need to add custom fields on an entity, extend and entity from medusa;
- You need to override a service to extend some logic, extend a service from medusa;
- And so on...

# Dependency graph

Here is the architecture of this package and how modules are related to each other. It will help you navigate into the code base.

<img src="/assets/medusa-extender.jpeg"
     onerror="if (this.src != './media/medusa-extender.jpeg') this.src = './media/medusa-extender.jpeg';"
     alt="Dependency graph" />

# Api doc

[Read more about it](./docs)

# Usage

> You have to know that using this package will disallow the usage of the command `medusa develop`.

Since that you need to extend the loading flow of medusa, using this package means
that you have to start the server yourself.

this is not a problem. Here is how you do that.

## Server

In your project, create a file such as `main.ts`, then copy paste de code bellow.

````typescript
// main.ts

import express = require('express');
import { Medusa } from 'medusa-extender';
import { resolve } from 'path';
import config = require('./medusa-config');

async function bootstrap() {
    const expressInstance = express();

    const rootDir = resolve(__dirname);
    await new Medusa(rootDir, expressInstance).load();

    expressInstance.listen(config.serverConfig.port, () => {
        console.log('The server is started');
    });
}

bootstrap();
````

The code above allows you to manually launch the medusa engine and will load all your components from the following directories

```
|- src
|---- yourModule
|-------- services
|-------- entities
|-------- repositories
|-------- routes
|-------- migrations
|---- yourOtherModule
|-------- services
|-------- entities
|-------- repositories
|-------- routes
|-------- migrations
| ...
```

with that in mind, you can organise your code as you want, the scanner will take care of recursively looking for those
directories.

## Medusa module

This module is the main module that wee have seen above and that allow us to load
medusa under the hood. But, it also allows you to add custom middleware that you
would want to be used either before or after the authentication occured.

<details>
<summary>Click to see the middleware example</summary>

<section>

In this example, the middleware will be applied after the authentication flow.
When the endpoint `POST /admin/users/` will be hit, a new `UserSubscriber` will be attach
to the entity and the previous one will be removed, in order to refresh the injected cradle and get all scoped elements available in the services
that will listen for the event that occured on the user entity.

```typescript
import { Express, NextFunction, Response } from 'express';
import {
    MedusaAuthenticatedRequest,
    MedusaMiddleware,
    MedusaResolverKeys,
    MedusaRouteOptions,
    MedusaUtils,
} from 'medusa-extender';
import { Connection } from 'typeorm';
import Utils from '@core/utils';
import UserSubscriber from '@modules/user/subscribers/user.subscriber';

export default class AttachUserSubscribersMiddleware
	implements MedusaMiddleware<typeof AttachUserSubscribersMiddleware>
{
    public static isPostAuth = true;
    public static isHandledByMedusa = true;
    
    public static get routesOptions(): MedusaRouteOptions {
        return {
            path: '/admin/users/',
            method: 'post',
        };
    }
    
    public consume(options: { app: Express }): (req: MedusaAuthenticatedRequest | Request, res: Response, next: NextFunction) => void | Promise<void> {
        const routeOptions = AttachUserSubscribersMiddleware.routesOptions;
        options.app.use((req: MedusaAuthenticatedRequest, res: Response, next: NextFunction): void => {
            if (Utils.isExpectedRoute([routeOptions], req)) {
                const { connection } = req.scope.resolve(MedusaResolverKeys.manager) as { connection: Connection };
                MedusaUtils.attachOrReplaceEntitySubscriber(connection, UserSubscriber);
            }
            return next();
        });
    
        return (req: MedusaAuthenticatedRequest | Request, res: Response, next: NextFunction) => next();
    }
}
```

</section>
</details>

Then, to load the middlewares you have to update a bit you `main.ts` file like this

```typescript
// main.ts

import express = require('express');
import { Medusa } from 'medusa-extender';
import { resolve } from 'path';
import AttachUserSubscribersMiddleware from '@modules/user/middlewares/attachUserSubscribers.middleware';
import config = require('./medusa-config');

async function bootstrap() {
    const expressInstance = express();

    const rootDir = resolve(__dirname);
    await new Medusa(rootDir, expressInstance)
        .consume(AttachUserSubscribersMiddleware)
        .load();

    expressInstance.listen(config.serverConfig.port, () => {
        console.log('The server is started');
    });
}

bootstrap();
```

## Entities

there is two possibilities, you want either to create a new entity or to override an 
existing one.

### Add entity

<details>
<summary>Click to see the example</summary>

<section>

```typescript
import { MedusaEntity } from 'medusa-extender';
import { Entity } from 'typeorm';

@Entity()
class Myentity implements MedusaEntity {
    static isHandledByMedusa = true;
    static resolutionKey = 'the_name_in_the_container';
}
```

</section>
</details>

### Override entity

<details>
<summary>Click to see the example</summary>

<section>

```typescript
import { User as MedusaUser } from '@medusa/medusa/dist';
import { MedusaEntity } from 'medusa-extender';
import { Entity } from 'typeorm';

@Entity()
class User extends MedusaUser implements MedusaEntity<User, typeof MedusaUser> {
    static overriddenType = MedusaUser;
    static isHandledByMedusa = true;
}
```

</section>
</details>

## Services

there is two possibilities, you want either to create a new service or to override an 
existing one.

### Add service

<details>
<summary>Click to see the example</summary>

<section>

```typescript
import { MedusaService } from 'medusa-extender';
import { UserService as MedusaUserService } from '@medusajs/medusa/dist/services';
import { EntityManager } from 'typeorm';
import { Lifetime } from 'awilix';
import EventBusService from '@medusajs/medusa/dist/services/event-bus';
import { UserRepository } from '@medusajs/medusa/dist/repositories/user';

type ConstructorParams = {
    manager: EntityManager;
    userRepository: typeof UserRepository;
    eventBusService: EventBusService;
};

export default class UserService extends MedusaUserService implements MedusaService<typeof UserService> {
    public static overriddenType = MedusaUserService;
    public static isHandledByMedusa = true;
    public static scope = Lifetime.SINGLETON;
    
    readonly #manager: EntityManager;
    readonly #userRepository: typeof UserRepository;
    readonly #eventBus: EventBusService;

    constructor(private readonly container: ConstructorParams) {
        super(container);
        this.#manager = container.manager;
        this.#userRepository = container.userRepository;
        this.#eventBus = container.eventBusService;
    }
}
```

</section>
</details>

### Override service

<details>
<summary>Click to see the example</summary>


<section>

```typescript
import { MedusaService } from 'medusa-extender';
import { EntityManager } from 'typeorm';
import { Lifetime } from 'awilix';
import EventBusService from '@medusajs/medusa/dist/services/event-bus';
import { UserRepository } from '@medusajs/medusa/dist/repositories/user';

type ConstructorParams = {
    manager: EntityManager;
    userRepository: typeof UserRepository;
    eventBusService: EventBusService;
};

export default class MyService implements MedusaService<typeof MyService> {
    public static isHandledByMedusa = true;
    public static resolutionKey = 'the_name_in_the_container';
    public static scope = Lifetime.SINGLETON;
    
    readonly #manager: EntityManager;
    readonly #userRepository: typeof UserRepository;
    readonly #eventBus: EventBusService;
    
    constructor(private readonly container: ConstructorParams) {
        this.#manager = container.manager;
        this.#userRepository = container.userRepository;
        this.#eventBus = container.eventBusService;
    }
}
```

</section>
</details>