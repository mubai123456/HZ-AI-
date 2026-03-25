import type { AppInputField } from "@/lib/types";
import {
  buildConfigFromNodes,
  buildNodesFromAppConfig,
  parseApiExample,
  type ParsedNode,
} from "@/lib/app-parser";

describe("app parser structured config helpers", () => {
  it("parses runninghub curl examples into provider app id, nodes and extra params", () => {
    const input = `curl --location --request POST 'https://www.runninghub.cn/openapi/v2/run/ai-app/2034448310248939522' \
--header "Content-Type: application/json" \
--header "Authorization: Bearer \${RUNNINGHUB_API_KEY}" \
--data-raw '{
  "nodeInfoList": [
    {
      "nodeId": "33",
      "fieldName": "image",
      "fieldValue": "1476c19230c1d3ed6e1af75bd2d91164af5cc64074f149fb9f4f6557eb7144bf.png",
      "description": "image"
    },
    {
      "nodeId": "30",
      "fieldName": "image",
      "fieldValue": "ba950b51c7c0549895cd4259825617989c57117a89a9868336060270c8d66a0a.jpg",
      "description": "image"
    },
    {
      "nodeId": "32",
      "fieldName": "image",
      "fieldValue": "2ebb1c35b1318f198d3c9dda182c5b53aebd7b0c8a9a8b7b1eee7142e8568f52.png",
      "description": "image"
    }
  ],
  "instanceType": "default",
  "usePersonalQueue": "false"
}'`;

    const result = parseApiExample(input);

    expect(result.providerAppId).toBe("2034448310248939522");
    expect(result.extraParams).toEqual({
      instanceType: "default",
      usePersonalQueue: "false",
    });
    expect(result.nodes).toHaveLength(3);
    expect(result.nodes.map((item) => item.nodeId)).toEqual(["33", "30", "32"]);
    expect(result.nodes.map((item) => item.fieldName)).toEqual(["image", "image", "image"]);
    expect(result.nodes.map((item) => item.key)).toEqual(["image_1", "image_2", "image_3"]);
  });

  it("builds existing app json config back into editable nodes", () => {
    const formSchemaJson: AppInputField[] = [
      {
        key: "image1",
        label: "参考图 1",
        type: "image",
        description: "主图",
        maxItems: 1,
        hidden: true,
      },
      {
        key: "prompt",
        label: "提示词",
        type: "textarea",
        description: "输入提示词",
        required: true,
      },
      {
        key: "aspectRatio",
        label: "比例",
        type: "select",
        options: [
          { label: "1:1", value: "1:1" },
          { label: "3:4", value: "3:4" },
        ],
      },
    ];

    const nodes = buildNodesFromAppConfig(
      formSchemaJson,
      {
        image1: "33.image",
        prompt: "30.text",
        aspectRatio: "31.ratio",
      },
      {
        aspectRatio: "3:4",
        instanceType: "default",
      },
    );

    expect(nodes).toEqual([
      expect.objectContaining({
        key: "image1",
        nodeId: "33",
        fieldName: "image",
        label: "参考图 1",
        type: "image",
        defaultValue: "",
        hidden: true,
      }),
      expect.objectContaining({
        key: "prompt",
        nodeId: "30",
        fieldName: "text",
        label: "提示词",
        type: "textarea",
        required: true,
      }),
      expect.objectContaining({
        key: "aspectRatio",
        nodeId: "31",
        fieldName: "ratio",
        label: "比例",
        type: "select",
        defaultValue: "3:4",
      }),
    ]);
  });

  it("generates runtime json config from editable nodes and extra params", () => {
    const nodes: ParsedNode[] = [
      {
        key: "image1",
        label: "参考图 1",
        type: "image",
        nodeId: "33",
        fieldName: "image",
        defaultValue: "",
        description: "主图",
        required: false,
        hidden: true,
        options: [],
      },
      {
        key: "prompt",
        label: "提示词",
        type: "textarea",
        nodeId: "30",
        fieldName: "text",
        defaultValue: "",
        description: "输入提示词",
        required: true,
        options: [],
      },
      {
        key: "aspectRatio",
        label: "比例",
        type: "select",
        nodeId: "31",
        fieldName: "ratio",
        defaultValue: "1:1",
        description: "",
        required: false,
        options: [
          { label: "1:1", value: "1:1" },
          { label: "3:4", value: "3:4" },
        ],
      },
    ];

    const result = buildConfigFromNodes(nodes, {
      instanceType: "default",
      usePersonalQueue: "false",
    });

    expect(result.formSchemaJson).toEqual([
      {
        key: "image1",
        label: "参考图 1",
        type: "image",
        required: false,
        hidden: true,
        description: "主图",
      },
      {
        key: "prompt",
        label: "提示词",
        type: "textarea",
        required: true,
        description: "输入提示词",
      },
      {
        key: "aspectRatio",
        label: "比例",
        type: "select",
        required: false,
        description: "",
        options: [
          { label: "1:1", value: "1:1" },
          { label: "3:4", value: "3:4" },
        ],
      },
    ]);
    expect(result.requestMappingJson).toEqual({
      image1: "33.image",
      prompt: "30.text",
      aspectRatio: "31.ratio",
    });
    expect(result.defaultParamsJson).toEqual({
      aspectRatio: "1:1",
      instanceType: "default",
      usePersonalQueue: "false",
    });
  });

  it("parses select nodes from RunningHub fieldData metadata", () => {
    const input = JSON.stringify({
      nodeInfoList: [
        {
          nodeId: "10",
          fieldName: "prompt",
          fieldValue: "",
          description: "输入文本",
        },
        {
          nodeId: "11",
          fieldName: "aspectRatio",
          fieldValue: "3:4",
          description: "选择比例",
          fieldData: JSON.stringify([["1:1", "3:4", "16:9"], { default: "1:1" }]),
        },
        {
          nodeId: "12",
          fieldName: "resolution",
          fieldValue: "2k",
          description: "分辨率",
          fieldData: JSON.stringify([
            { name: "2k", index: "2k", description: "2K", fastIndex: 1 },
            { name: "4k", index: "4k", description: "4K", fastIndex: 2 },
          ]),
        },
        {
          nodeId: "13",
          fieldName: "channel",
          fieldValue: "ecommerce",
          description: "通道",
          fieldData: JSON.stringify([
            { name: "ecommerce", index: "ecommerce", description: "电商", fastIndex: 1 },
            { name: "portrait", index: "portrait", description: "人像", fastIndex: 2 },
          ]),
        },
      ],
      instanceType: "default",
    });

    const result = parseApiExample(input);

    expect(result.nodes).toEqual([
      expect.objectContaining({
        key: "prompt",
        type: "textarea",
      }),
      expect.objectContaining({
        key: "aspectRatio",
        type: "select",
        defaultValue: "1:1",
        options: [
          { label: "1:1", value: "1:1" },
          { label: "3:4", value: "3:4" },
          { label: "16:9", value: "16:9" },
        ],
      }),
      expect.objectContaining({
        key: "resolution",
        type: "select",
        defaultValue: "2k",
        options: [
          { label: "2K", value: "2k" },
          { label: "4K", value: "4k" },
        ],
      }),
      expect.objectContaining({
        key: "channel",
        type: "select",
        defaultValue: "ecommerce",
        options: [
          { label: "电商", value: "ecommerce" },
          { label: "人像", value: "portrait" },
        ],
      }),
    ]);
    expect(result.extraParams).toEqual({ instanceType: "default" });
  });
});
