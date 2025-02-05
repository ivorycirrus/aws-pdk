/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import * as path from "path";
import { ProjectUtils } from "@aws/monorepo";
import { Project } from "projen";
import { Language, Library, WebSocketLibrary } from "../../languages";
import { MockResponseDataGenerationOptions } from "../../types";
import { GeneratedHandlersProjects } from "../generate";
import { RuntimeVersionUtils } from "../runtime-version-utils";

/**
 * Enum for generator directories for non-runtime generators
 */
export enum OtherGenerators {
  // Infrastructure
  TYPESCRIPT_CDK_INFRASTRUCTURE = "typescript-cdk-infrastructure",
  PYTHON_CDK_INFRASTRUCTURE = "python-cdk-infrastructure",
  JAVA_CDK_INFRASTRUCTURE = "java-cdk-infrastructure",
  TYPESCRIPT_ASYNC_CDK_INFRASTRUCTURE = "typescript-async-cdk-infrastructure",
  PYTHON_ASYNC_CDK_INFRASTRUCTURE = "python-async-cdk-infrastructure",
  JAVA_ASYNC_CDK_INFRASTRUCTURE = "java-async-cdk-infrastructure",
  // Handlers
  TYPESCRIPT_LAMBDA_HANDLERS = "typescript-lambda-handlers",
  PYTHON_LAMBDA_HANDLERS = "python-lambda-handlers",
  JAVA_LAMBDA_HANDLERS = "java-lambda-handlers",
  TYPESCRIPT_ASYNC_LAMBDA_HANDLERS = "typescript-async-lambda-handlers",
  PYTHON_ASYNC_LAMBDA_HANDLERS = "python-async-lambda-handlers",
  JAVA_ASYNC_LAMBDA_HANDLERS = "java-async-lambda-handlers",
  // Async runtime
  TYPESCRIPT_ASYNC_RUNTIME = "typescript-async-runtime",
  PYTHON_ASYNC_RUNTIME = "python-async-runtime",
  JAVA_ASYNC_RUNTIME = "java-async-runtime",
}

/**
 * Built in scripts.
 * If adding a script here, ensure you map it in TypeSafeApiProject (in /projenrc/projects)
 */
export enum TypeSafeApiScript {
  PARSE_OPENAPI_SPEC = "type-safe-api parse-openapi-spec",
  GENERATE = "type-safe-api generate",
  GENERATE_MOCK_DATA = "type-safe-api generate-mock-data",
  COPY_GRADLE_WRAPPER = "type-safe-api copy-gradle-wrapper",
  COPY_ASYNC_SMITHY_TRANSFORMER = "type-safe-api copy-async-smithy-transformer",
  GENERATE_ASYNCAPI_SPEC = "type-safe-api generate-asyncapi-spec",
}

/**
 * Generator directory for openapi generation containing templates, config etc.
 */
export type GeneratorDirectory =
  | Language
  | Library
  | WebSocketLibrary
  | OtherGenerators;

export interface CodegenOptions {
  readonly specPath: string;
  readonly templateDirs: string[];
  readonly metadata?: object;
}

/**
 * Return the environment that should be used for executing type safe api commands
 */
export const getTypeSafeApiTaskEnvironment = (): { [key: string]: string } => ({
  AWS_PDK_VERSION: ProjectUtils.getPdkVersion(),
});

/**
 * Build a command for running a script from this project's bin
 */
export const buildTypeSafeApiExecCommand = (
  script: TypeSafeApiScript,
  args?: string
): string => {
  return `npx --yes -p @aws/pdk@$AWS_PDK_VERSION ${script}${
    args ? ` ${args}` : ""
  }`;
};

export const buildCodegenCommandArgs = (options: CodegenOptions): string => {
  const metadata = options.metadata
    ? ` --metadata '${JSON.stringify(options.metadata)}'`
    : "";
  return `--specPath ${
    options.specPath
  } --outputPath . --templateDirs ${options.templateDirs
    .map((t) => `"${t}"`)
    .join(" ")}${metadata}`;
};

/**
 * Options for generating mock data json files
 */
export interface MockDataGenerationOptions
  extends MockResponseDataGenerationOptions {
  /**
   * The path of the OpenAPI spec to generate data for
   */
  readonly specPath: string;
  /**
   * Output sub directory relative to the outdir in which to generate mock data
   * Mock data will be written to a directory named 'mocks' within the sub directory
   * @default .
   */
  readonly outputSubDir?: string;
}

/**
 * Invoke the mock data generator script
 */
export const buildInvokeMockDataGeneratorCommand = (
  options: MockDataGenerationOptions
): string => {
  const outputPath = options.outputSubDir ?? ".";
  const locale = options.locale ? ` --locale ${options.locale}` : "";
  const maxArrayLength =
    options.maxArrayLength !== undefined
      ? ` --maxArrayLength ${options.maxArrayLength}`
      : "";
  const seed = options.seed !== undefined ? ` --seed ${options.seed}` : "";
  return buildTypeSafeApiExecCommand(
    TypeSafeApiScript.GENERATE_MOCK_DATA,
    `--specPath ${options.specPath} --outputPath ${outputPath}${locale}${maxArrayLength}${seed}`
  );
};

/**
 * Return vendor extensions containing details about the handler projects
 */
export const getHandlersProjectVendorExtensions = (
  targetProject: Project,
  { java, python, typescript }: GeneratedHandlersProjects
): Record<string, string | boolean> => ({
  "x-handlers-python-module": python?.moduleName ?? "",
  "x-handlers-java-package": java?.packageName ?? "",
  "x-handlers-typescript-asset-path": typescript
    ? path.join(
        path.relative(targetProject.outdir, typescript.outdir),
        "dist",
        "lambda"
      )
    : "",
  "x-handlers-python-asset-path": python
    ? path.join(
        path.relative(targetProject.outdir, python.outdir),
        "dist",
        "lambda"
      )
    : "",
  "x-handlers-java-asset-path": java
    ? path.join(
        path.relative(targetProject.outdir, java.outdir),
        java.distdir,
        ...java.pom.groupId.split("."),
        java.pom.artifactId,
        java.pom.version,
        `${java.pom.artifactId}-${java.pom.version}.jar`
      )
    : "",
  "x-handlers-node-lambda-runtime-version": typescript
    ? RuntimeVersionUtils.NODE.getLambdaRuntime(typescript.runtimeVersion)
    : "",
  "x-handlers-python-lambda-runtime-version": python
    ? RuntimeVersionUtils.PYTHON.getLambdaRuntime(python.runtimeVersion)
    : "",
  "x-handlers-java-lambda-runtime-version": java
    ? RuntimeVersionUtils.JAVA.getLambdaRuntime(java.runtimeVersion)
    : "",
});
