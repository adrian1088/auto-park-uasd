import { DefaultNamingStrategy, Table } from 'typeorm';

function snakeCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
}

export class SnakeCaseNamingStrategy extends DefaultNamingStrategy {
  tableName(targetName: string, customName: string | undefined): string {
    const tableName = super.tableName(targetName, customName);
    return snakeCase(tableName);
  }

  columnName(
    propertyName: string | Table,
    customName: string | undefined,
    embeddedPrefixes: string[],
  ): string {
    const normalizedCustomName = customName ?? '';
    const colName = super.columnName(
      propertyName as string,
      normalizedCustomName,
      embeddedPrefixes,
    );
    return snakeCase(colName);
  }

  primaryKeyName(tableOrName: string | Table, columnNames: string[]): string {
    const pkName = `pk_${this.getTableName(tableOrName)}_${columnNames.join('_')}`;
    return snakeCase(pkName);
  }

  foreignKeyName(
    tableOrName: string | Table,
    columnNames: string[],
    _referencedTablePath?: string,
    _referencedColumnName?: string[],
  ): string {
    const fkName = `fk_${this.getTableName(tableOrName)}_${columnNames.join('_')}${_referencedTablePath ? `_${_referencedTablePath}` : ''}${_referencedColumnName ? `_${_referencedColumnName.join('_')}` : ''}`;
    return snakeCase(fkName);
  }

  indexName(
    tableOrName: string | Table,
    columnNames: string[],
    where?: string,
  ): string {
    const columnNamesStr = columnNames.join('_');
    return snakeCase(
      `idx_${this.getTableName(tableOrName)}_${columnNamesStr}${
        where ? `_${where.replace(/\s+/g, '_')}` : ''
      }`,
    );
  }

  uniqueConstraintName(
    tableOrName: string | Table,
    columnNames: string[],
  ): string {
    const uqName = `uq_${this.getTableName(tableOrName)}_${columnNames.join('_')}`;
    return snakeCase(uqName);
  }

  relationConstraintName(
    tableOrName: string | Table,
    columnNames: string[],
    where?: string,
  ): string {
    const relName = `rel_${this.getTableName(tableOrName)}_${columnNames.join('_')}${
      where ? `_${where}` : ''
    }`;
    return snakeCase(relName);
  }

  checkConstraintName(
    tableOrName: string | Table,
    expression: string,
    isEnum?: boolean,
  ): string {
    const chkName = super.checkConstraintName(tableOrName, expression, isEnum);
    return snakeCase(chkName);
  }

  exclusionConstraintName(
    tableOrName: string | Table,
    expression: string,
  ): string {
    const exclName = super.exclusionConstraintName(tableOrName, expression);
    return snakeCase(exclName);
  }

  defaultConstraintName(tableOrName: Table | string, columnName: string): string {
    const defName = super.defaultConstraintName(tableOrName, columnName);
    return snakeCase(defName);
  }
  
  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
    secondPropertyName: string,
  ): string {
    const joinTableName = `${firstTableName}_${secondTableName}`;
    return snakeCase(joinTableName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    const joinColName = super.joinColumnName(
      relationName,
      referencedColumnName,
    );
    return snakeCase(joinColName);
  }

  joinTableColumnName(
    tableName: string | Table,
    propertyName: string,
    columnName: string,
  ): string {
    const joinColName = super.joinTableColumnName(
      this.getTableName(tableName),
      propertyName,
      columnName,
    );
    return snakeCase(joinColName);
  }


  eagerJoinRelationAlias(alias: string, propertyPath: string): string {
    return `${alias}__${propertyPath}`;
  }
}
