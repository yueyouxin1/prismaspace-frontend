# @prismaspace/resources

Unified resource host package for PrismaSpace public workbenches.

- `@prismaspace/resources`
  - root export for host/types
- `@prismaspace/resources/core`
  - facade to shared workbench core
- `@prismaspace/resources/host`
  - `ResourceWorkbenchHost` (prop-driven host)
- `@prismaspace/resources/registry`
  - default resource type registry

## Purpose

This package lets a host application mount the official PrismaSpace resource workbench container without re-implementing:

- resource type switching
- default workbench registry
- resource detail loading
- workspace scoped resource validation

## Boundary

This package does not own host route parsing or router conventions.

- `ResourceWorkbenchHost` is host-agnostic
- route-aware `ResourceWorkbenchView` belongs to the consuming app such as `studio-web`
