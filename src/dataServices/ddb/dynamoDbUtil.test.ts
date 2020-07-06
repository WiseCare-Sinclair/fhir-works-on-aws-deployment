import DynamoDbUtil, { DOCUMENT_STATUS_FIELD, LOCK_END_TS_FIELD } from './dynamoDbUtil';
import DOCUMENT_STATUS from './documentStatus';
import { clone } from '../../common/utilities';
import { timeFromEpochInMsRegExp, utcTimeRegExp } from '../../regExpressions';

describe('cleanItem', () => {
    const id = 'ee3928b9-8699-4970-ba49-8f41bd122f46';
    const versionId = 2;

    test('Remove documentStatus field and format id correctly', () => {
        const item: any = {
            resourceType: 'Patient',
            id: DynamoDbUtil.generateFullId(id, versionId),
        };

        item[LOCK_END_TS_FIELD] = Date.now();
        item[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.AVAILABLE;

        const actualItem = DynamoDbUtil.cleanItem(item);

        expect(actualItem).toEqual({
            resourceType: 'Patient',
            id,
        });
    });

    test('Return item correctly if documentStatus and lockEndTs is not in the item', () => {
        const item = {
            resourceType: 'Patient',
            id: DynamoDbUtil.generateFullId(id, versionId),
        };

        const actualItem = DynamoDbUtil.cleanItem(item);

        expect(actualItem).toEqual({
            resourceType: 'Patient',
            id,
        });
    });
});

describe('prepItemForDdbInsert', () => {
    const id = '8cafa46d-08b4-4ee4-b51b-803e20ae8126';
    const versionId = 1;
    const resource = {
        resourceType: 'Patient',
        id,
        name: [
            {
                family: 'Jameson',
                given: ['Matt'],
            },
        ],
        gender: 'male',
        meta: {
            lastUpdated: '2020-03-26T15:46:55.848Z',
            versionId: versionId.toString(),
        },
    };

    const checkExpectedItemMatchActualItem = (actualItem: any, updatedResource: any) => {
        const expectedItem = clone(updatedResource);
        expectedItem[DOCUMENT_STATUS_FIELD] = DOCUMENT_STATUS.PENDING;
        expectedItem.id = DynamoDbUtil.generateFullId(id, versionId);
        expectedItem.meta = {
            versionId: versionId.toString(),
            lastUpdated: expect.stringMatching(utcTimeRegExp),
        };

        expect(actualItem).toMatchObject(expectedItem);
        expect(actualItem[LOCK_END_TS_FIELD].toString()).toEqual(expect.stringMatching(timeFromEpochInMsRegExp));
    };

    test('Return item correctly when full meta field already exists', () => {
        // BUILD
        const updatedResource = clone(resource);

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, versionId, DOCUMENT_STATUS.PENDING);

        // CHECK
        updatedResource.meta.versionId = versionId.toString();
        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });

    test('Return item correctly when meta field does not exist yet', () => {
        // BUILD
        const updatedResource = clone(resource);
        delete updatedResource.meta;

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, versionId, DOCUMENT_STATUS.PENDING);

        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });

    test('Return item correctly when meta field exist but meta does not contain versionId', () => {
        // BUILD
        const updatedResource = clone(resource);
        delete updatedResource.meta.versionId;

        // OPERATE
        const actualItem = DynamoDbUtil.prepItemForDdbInsert(updatedResource, id, versionId, DOCUMENT_STATUS.PENDING);

        // CHECK
        checkExpectedItemMatchActualItem(actualItem, updatedResource);
    });
});
