import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuditConfigService {
  private enabled: boolean;
  private entities = new Set<string>();
  private events = new Set<string>();

  constructor(private readonly config: ConfigService) {
    this.enabled = this.config.get<boolean>('audit.enabled') ?? true;
    (this.config.get<string[]>('audit.entities') ?? []).forEach((entity) =>
      this.entities.add(entity.toLowerCase()),
    );
    (this.config.get<string[]>('audit.events') ?? []).forEach((event) =>
      this.events.add(event.toLowerCase()),
    );
  }

  isEnabled() {
    return this.enabled;
  }

  setEnabled(value: boolean) {
    this.enabled = value;
  }

  getEntities() {
    return Array.from(this.entities);
  }

  setEntities(list: string[]) {
    this.entities = new Set(list.map(s => s.toLowerCase()));
  }

  addEntity(entityName: string) {
    this.entities.add(entityName.toLowerCase());
  }

  allowsEntity(entityName: string) {
    const key = entityName.toLowerCase();
    return this.entities.size === 0 ? true : this.entities.has(key);
  }

  allowsEvent(event: string) {
    return this.events.size === 0 || this.events.has(event.toLowerCase());
  }

  getEvents() {
    return Array.from(this.events);
  }

  setEvents(list: string[]) {
    this.events = new Set(list.map(s => s.toLowerCase()));
  }

  addEvent(eventName: string) {
    this.events.add(eventName.toLowerCase());
  }
}
