# Data Pipeline

## Overview

This is a data ingestion pipeline that processes CSV files and loads them into PostgreSQL.

## Development

- Use poetry for dependency management
- Run tests with `pytest`
- Format with `black` and `ruff`

## Architecture

The pipeline has three stages:
1. Ingest — reads from S3
2. Transform — applies business rules
3. Load — writes to PostgreSQL
