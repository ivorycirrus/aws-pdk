/*! Copyright [Amazon.com](http://amazon.com/), Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0 */
import { DependencyType } from "projen";
import { JavaProject } from "projen/lib/java";
import {
  CodeGenerationSourceOptions,
  GeneratedJavaRuntimeOptions,
} from "../../types";
import { TypeSafeApiCommandEnvironment } from "../components/type-safe-api-command-environment";
import {
  buildCodegenCommandArgs,
  buildTypeSafeApiExecCommand,
  CodegenOptions,
  TypeSafeApiScript,
} from "../components/utils";

/**
 * Configuration for the generated java runtime project
 */
export interface GeneratedJavaRuntimeBaseProjectOptions
  extends GeneratedJavaRuntimeOptions,
    CodeGenerationSourceOptions {}

const DEPENDENCIES: string[] = [
  // Required for open api generated code
  "io.swagger/swagger-annotations@1.6.8",
  "com.google.code.findbugs/jsr305@3.0.2",
  "com.squareup.okhttp3/okhttp@4.10.0",
  "com.squareup.okhttp3/logging-interceptor@4.10.0",
  "com.google.code.gson/gson@2.9.1",
  "io.gsonfire/gson-fire@1.8.5",
  "org.apache.commons/commons-lang3@3.12.0",
  "jakarta.annotation/jakarta.annotation-api@1.3.5",
  "org.openapitools/jackson-databind-nullable@0.2.4",
  "javax.ws.rs/jsr311-api@1.1.1",
  "javax.ws.rs/javax.ws.rs-api@2.1.1",
  // For handler wrappers
  "com.amazonaws/aws-lambda-java-core@1.2.1",
  "com.amazonaws/aws-lambda-java-events@3.11.0",
  // Lombok is used to add the builder pattern to models for neater construction
  "org.projectlombok/lombok@1.18.24",
  // Interceptors
  "software.amazon.lambda/powertools-logging@1.18.0",
  "software.amazon.lambda/powertools-tracing@1.18.0",
  "software.amazon.lambda/powertools-metrics@1.18.0",
  // SnapStart
  "io.github.crac/org-crac@0.1.3",
];

const TEST_DEPENDENCIES: string[] = [
  "org.junit.jupiter/junit-jupiter-api@5.9.1",
  "org.mockito/mockito-core@3.12.4",
];

/**
 * Java project containing types generated using OpenAPI Generator CLI
 */
export abstract class GeneratedJavaRuntimeBaseProject extends JavaProject {
  /**
   * The package name, for use in imports
   */
  public readonly packageName: string;

  /**
   * Options configured for the project
   */
  protected readonly options: GeneratedJavaRuntimeBaseProjectOptions;

  constructor(options: GeneratedJavaRuntimeBaseProjectOptions) {
    super({
      ...(options as any),
      sample: false,
      junit: false,
    });
    TypeSafeApiCommandEnvironment.ensure(this);
    this.options = options;

    // Add dependencies
    DEPENDENCIES.forEach((dep) => this.addDependency(dep));
    TEST_DEPENDENCIES.forEach((dep) => this.addTestDependency(dep));

    // Pin constructs version
    this.deps.removeDependency(
      "software.constructs/constructs",
      DependencyType.BUILD
    );
    this.addDependency("software.constructs/constructs@10.3.0");

    this.packageName = `${this.pom.groupId}.${this.name}.runtime`;

    // Generate the java code
    const generateTask = this.addTask("generate");
    generateTask.exec(
      buildTypeSafeApiExecCommand(
        TypeSafeApiScript.GENERATE,
        this.buildGenerateCommandArgs()
      )
    );

    this.preCompileTask.spawn(generateTask);

    if (!options.commitGeneratedCode) {
      // Ignore all the generated code
      this.gitignore.addPatterns("src", "docs", "api", "README.md");
    }
    this.gitignore.addPatterns(".openapi-generator", ".tsapi-manifest");
  }

  public buildGenerateCommandArgs = () => {
    return buildCodegenCommandArgs(this.buildCodegenOptions());
  };

  protected abstract buildCodegenOptions(): CodegenOptions;
}
