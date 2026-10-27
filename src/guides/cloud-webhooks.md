---
title: Report cloud audit logs with a webhook
description: Place decoys in an AWS or Azure account and send the audit records of access to them to a honeytoken, so that they open an incident.
---

# Report cloud audit logs with a webhook

A decoy in a cloud account raises no request that Nyktus can see. Whoever reads a secret or tries to assume a role leaves a record in the audit log of the provider, and a rule in your account can forward that record with a `POST` to the URL of a honeytoken. After this page you know which decoys the catalog offers for AWS and Azure, what you set up in the account for each, and where in the event you find the caller.

The page explains the common pattern. The commands are in the guide of each story of the [deception catalog](/guides/catalog), which you read in the console after you applied the story to a [scenario](/guides/scenarios), and in the [catalog reference](/guides/catalog-reference). It assumes that you administer the cloud account.

## How the report reaches Nyktus

The provider writes an audit record when someone uses the decoy. A rule in your account selects the records about the decoy, shortens them and sends them with a `POST` to the URL of a `web_url` honeytoken. Nobody opens that URL; it is only the address of the report. Nyktus records the request like any other `POST`, see [Report with a POST](/guides/honeytokens#report-with-a-post), and opens an incident for the scenario.

Two things follow from the way the provider sends the record:

- **The caller is in the body, not in the event.** The address of the event is that of the provider's service that sends the webhook. The caller, its address and its client are in the start of the body, which the incident shows as text of an attacker.
- **The body must stay small.** Nyktus keeps the first 4096 bytes. The guides tell the provider to send only the fields you need: an EventBridge input transformer for AWS, the dimensions of an alert for Azure.

## The decoys

Each story has one honeytoken, `Webhook`, with the severity high, and no files: the decoy is a resource in the account, and the guide lists the commands that create it.

| Story | Decoy in the account | What raises the report |
|---|---|---|
| `aws-iam-user-key` | An IAM user without any permission, with an access key that you place in a file | Any call signed with the key |
| `aws-secrets-manager-secret` | A secret with invented credentials | Reading or describing it |
| `aws-ssm-parameter` | A parameter of the type `SecureString` | Reading it by name |
| `aws-assume-role` | A role that trusts the account and holds no permission | Trying to assume it, also when AWS refuses |
| `azure-key-vault-secret` | A secret with a random value in an existing key vault | Reading its value |
| `azure-storage-blob` | A private container with a file of random bytes, in an existing storage account | Listing or reading the container |

None of the decoys holds a real credential or a permission. The guides say what each one changes in the account and how to remove it.

## What the account needs

| | AWS | Azure |
|---|---|---|
| Source of the record | A CloudTrail trail that logs management events, read and write | The diagnostic setting of the resource, sent to a Log Analytics workspace |
| What selects and sends | An EventBridge rule with an API destination | An alert rule on the workspace and an action group with a webhook |
| Where it applies | One rule in every region where a call can land | One rule for the resource |
| Cost | Storage of the trail, the secret or parameter where the provider charges for it, calls of the API destination | Ingestion of **all** logs of the resource, evaluation of the alert rule |

Check the cost on the pricing pages of the provider before you start. The logs of an Azure resource are ingested as a whole, not only the accesses to the decoy, so a vault or a storage account with little traffic is cheaper.

The URL of the honeytoken stands in your account, in the API destination or the action group. Treat it as a secret and give the scenario a honeytoken for each account.

## Read the report

The body of the event shows what the provider sent. For AWS it is a short object:

```json
{"eventName":"GetSecretValue","sourceIPAddress":"203.0.113.10","userAgent":"aws-cli/2.x ...","userArn":"arn:aws:sts::123456789012:assumed-role/NAME/SESSION","userType":"AssumedRole","accountId":"123456789012","region":"eu-central-1","time":"2026-01-01T10:00:00Z"}
```

For Azure it is an alert in the common alert schema, and the caller is in the list `dimensions` after the essentials of the alert:

```json
{"name":"CallerIPAddress","value":"203.0.113.10"},{"name":"clientInfo_s","value":"azsdk-python-keyvault-secrets/4.x ..."},{"name":"ResultSignature","value":"OK"}
```

A caller from another AWS account or from an AWS service has no ARN; `userType` and `accountId` then name it. The Azure body does not name the identity: it is in the log of the resource in your workspace at the time of the alert.

## Test the report

Use the decoy yourself, as the guide of the story shows, with your own identity. The record arrives after minutes: CloudTrail delivers an event about five minutes after the call on average, and Azure Monitor gives no guarantee, so allow a quarter of an hour. Then the scenario shows an incident. Look at the body for the address of the caller, close the incident, and remove anything you added for the test.

If nothing arrives:

| Symptom | Cause | What to do |
|---|---|---|
| No record leaves the provider. | AWS: no trail logs, or it does not log read events, or the rule is in another region than the call. Azure: the diagnostic setting is missing. | Check the trail, the selectors and the region of the rule; check the diagnostic setting of the resource. |
| The provider sends, but no event appears. | Nyktus answers every `POST` with `200`, also for a value it does not know. The URL may be wrong, or the honeytoken disabled or over its limit. | Look for `trigger: request` in the [log](/operate/logs) of the trigger: `unknown`, `disabled` or `limited` names the cause. |
| An Azure event has no `dimensions`. | The body was cut at 4096 bytes before them, because the names of the subscription, resource group and rule are long. | Use shorter names and repeat the test. |

## What Nyktus stores

The first 4096 bytes of each report, as text, never parsed and never part of an alert. The report holds addresses, client names and the ARN or account of the caller, and everyone who can read events reads them, see [Personal data](/guides/incidents#personal-data).

## Limits

- **The trail and the diagnostic setting are the source.** Whoever stops the trail or removes the setting stops the reports without a sign.
- **Regions.** An AWS call to a region without a rule is not reported. An access key can be used against the global endpoint of the security token service, which AWS records in `us-east-1`, or against any regional endpoint.
- **Delay and repetition.** The record arrives after minutes, and a provider that does not see success in time sends the request again, so the same access can be reported twice. Azure can also keep a second access from the same address and client from being reported within a short time.
- **Your own tools raise the alert.** Anything of yours that reads every secret, role or container, such as an inventory or a backup, reads the decoy too.
- **Not every access is matched.** The guide of each story lists what its rule matches, for example that listing the secrets of an account names no secret and raises nothing.
- **Whoever can read the rule can read the URL.** An intruder with read access to EventBridge or to the action group sees it, and can send forged events until the limit of 10 events a minute stops them from adding more.
