import { ApplicationConfigurationApplication } from "./application-configuration";

export { createServerApplicationBinding } from "./application-access";
export type {
  ServerApplicationBinding,
  TrustedApplicationContext,
} from "./application-access";

export class ApplicationAssemblyApplication extends ApplicationConfigurationApplication {}
