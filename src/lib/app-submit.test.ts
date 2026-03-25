import {
  buildPromptTemplateInputVariables,
  composePromptSegments,
  extractProviderSubmitOptions,
} from "@/lib/app-submit";

describe("app submit helpers", () => {
  it("composes provider prompt from template and user input only", () => {
    expect(
      composePromptSegments({
        templatePrompt: "模板前缀",
        userPrompt: "用户补充",
      }),
    ).toBe("模板前缀\n\n用户补充");
  });

  it("replaces supported input variables inside the template prompt", () => {
    expect(
      composePromptSegments({
        templatePrompt: [
          "主体：{{input.prompt}}",
          "",
          "风格：{{input.style}}",
          "场景：{{input.scene}}",
          "负面：{{input.negative_prompt}}",
        ].join("\n"),
        userPrompt: "这个值不该再被直接硬拼接",
        inputVariables: {
          prompt: "女装模特，街拍半身照",
          style: "高级感时尚大片",
          scene: "自然光，85mm，浅景深",
          negative_prompt: "低清晰、多余肢体",
        },
      }),
    ).toBe(
      [
        "主体：女装模特，街拍半身照",
        "",
        "风格：高级感时尚大片",
        "场景：自然光，85mm，浅景深",
        "负面：低清晰、多余肢体",
      ].join("\n"),
    );
  });

  it("removes extra empty lines when a referenced variable is missing", () => {
    expect(
      composePromptSegments({
        templatePrompt: ["基础要求", "", "场景：{{input.scene}}", "", "结束"].join("\n"),
        inputVariables: {
          prompt: "兼容占位",
        },
      }),
    ).toBe(["基础要求", "结束"].join("\n\n"));
  });

  it("builds prompt variables from form data", () => {
    expect(
      buildPromptTemplateInputVariables({
        prompt: "  用户主要需求  ",
        style: "  电商高级感  ",
        scene: "  室内橱窗  ",
        negative_prompt: "  低清晰  ",
        ignored: "  extra  ",
      }),
    ).toEqual({
      prompt: "用户主要需求",
      style: "电商高级感",
      scene: "室内橱窗",
      negative_prompt: "低清晰",
      ignored: "extra",
    });
  });

  it("extracts runninghub top-level params from default params", () => {
    expect(
      extractProviderSubmitOptions(
        {
          aspectRatio: "1:1",
          instanceType: "professional",
          usePersonalQueue: "true",
        },
        ["aspectRatio"],
      ),
    ).toEqual({
      instanceType: "professional",
      usePersonalQueue: "true",
    });
  });
});
