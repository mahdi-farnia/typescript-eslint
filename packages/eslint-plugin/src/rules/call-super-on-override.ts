import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import type {
  ReportDescriptor,
  RuleFix,
  SourceCode,
} from '@typescript-eslint/utils/src/ts-eslint';

import * as utils from '../util';

type Options = [
  {
    ignoreMethods: boolean;
    ignoreGetters: boolean;
    ignoreSetters: boolean;
  },
];

type MessageId = 'missingSuperMethodCall';

type MethodDefinitionKindWithoutCtor = Exclude<
  TSESTree.MethodDefinition['kind'],
  'constructor'
>;

export default utils.createRule<Options, MessageId>({
  name: 'override-super',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require overridden methods to call super.method in their body',
      recommended: 'warn',
    },
    messages: {
      missingSuperMethodCall:
        'Use super.{{property}}({{parameters}}) to avoid missing super class method implementations',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          ignoreMethods: {
            type: 'boolean',
          },
          ignoreGetters: {
            type: 'boolean',
          },
          ignoreSetters: {
            type: 'boolean',
          },
        },
        additionalProperties: false,
      },
    ],
    hasSuggestions: true,
  },
  defaultOptions: [
    {
      ignoreMethods: false,
      ignoreGetters: false,
      ignoreSetters: false,
    },
  ],
  create(context, [{ ignoreGetters, ignoreSetters, ignoreMethods }]) {
    function makeReport(
      node: TSESTree.MethodDefinition,
    ): ReportDescriptor<'missingSuperMethodCall'> {
      const sourceCode = context.getSourceCode(),
        PROPERTY_NAME = sourceCode.getText(node);

      return {
        messageId: 'missingSuperMethodCall',
        node,
        suggest: [
          {
            messageId: 'missingSuperMethodCall',
            data: {
              property: PROPERTY_NAME, // before: (node.key as TSESTree.Identifier).name
              // Setters must have exactly 1 parameter
              // Getters must not have any parameter
              // Methods must have all parameters
              parameters: createParametersReport(
                sourceCode,
                node.kind as MethodDefinitionKindWithoutCtor,
                node.value.params,
              ),
            },
            fix(fixer): RuleFix {
              const propertyBody = node.value.body!,
                firstToken = sourceCode.getFirstToken(propertyBody);

              if (firstToken == null) {
                return fixer.replaceTextRange(
                  propertyBody.range,
                  `{\tsuper.${PROPERTY_NAME}}\n${sourceCode.getText(
                    propertyBody,
                  )}}`, // super.method() + previous contents of body (e.g.: comments)
                );
              }

              return fixer.insertTextBefore(
                firstToken,
                `\tsuper.${PROPERTY_NAME}\n`,
              );
            },
          },
        ],
      };
    }

    return {
      MethodDefinition(node): void {
        // Skip not overridden properties and constructor and `declare` methods (empty body definition)
        if (
          !node.override ||
          node.kind === 'constructor' ||
          node.value.type === AST_NODE_TYPES.TSEmptyBodyFunctionExpression
        ) {
          return;
        }
        if (node.kind === 'method' && ignoreMethods) {
          return;
        }
        if (node.kind === 'get' && ignoreGetters) {
          return;
        }
        if (node.kind === 'set' && ignoreSetters) {
          return;
        }
        context.report(makeReport(node));
      },
    };
  },
});

function createParametersReport(
  source: Readonly<SourceCode>,
  kind: MethodDefinitionKindWithoutCtor,
  params: TSESTree.Parameter[],
): string {
  // Getters don't have any parameter to report
  if (kind === 'get') {
    return '';
  }

  const report = params.map(p => source.getText(p)); // before: (p as TSESTree.Identifier).name

  // Setters must have 1 parameter
  // Show report even if no parameter provided in source code ('value')
  if (kind === 'set') {
    return report[0].length === 0 ? 'value' : report[0];
  }

  return report.join(', ');
}
